use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};

#[derive(Deserialize)]
struct WeatherQuery {
    latitude: f64,
    longitude: f64,
    vineyard_id: Option<String>,
}

#[derive(Deserialize)]
struct OpenMeteoResponse {
    current: CurrentWeather,
    daily: DailyForecast,
}

#[derive(Deserialize)]
struct CurrentWeather {
    temperature_2m: f64,
    weather_code: i32,
}

#[derive(Deserialize)]
struct DailyForecast {
    time: Vec<String>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
    weather_code: Vec<i32>,
}

// Historical Weather API types (Open-Meteo Archive)
#[derive(Deserialize)]
struct HistoricalWeatherResponse {
    daily: HistoricalDaily,
}

#[derive(Deserialize)]
struct HistoricalDaily {
    time: Vec<String>,
    temperature_2m_max: Vec<f64>,
    temperature_2m_min: Vec<f64>,
    #[serde(default)]
    snowfall_sum: Vec<f64>,
}

// Calculated weather metrics for AI context
#[derive(Debug)]
struct SeasonalWeatherContext {
    total_snowfall_inches: f64,
    first_snow_date: Option<String>,
    coldest_temp_f: i32,
    coldest_date: Option<String>,
    last_freeze_date: Option<String>,  // Last day below 32F
    gdd_base50: f64,  // Growing degree days (base 50F)
    days_analyzed: usize,
}

#[derive(Deserialize)]
struct NominatimResponse {
    address: NominatimAddress,
}

#[derive(Deserialize)]
struct NominatimAddress {
    city: Option<String>,
    town: Option<String>,
    village: Option<String>,
    state: Option<String>,
}

#[derive(Serialize)]
struct WeatherResponse {
    current_temp_f: i32,
    current_condition: String,
    location: String,
    forecast: Vec<DayForecast>,
    alerts: Vec<Alert>,
}

#[derive(Serialize)]
struct Alert {
    alert_type: String,
    message: String,
    severity: String,
}

#[derive(Serialize)]
struct DayForecast {
    day: String,
    temp_high_f: i32,
    temp_low_f: i32,
    weather_code: i32,
}

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    database: String,
}

#[derive(Deserialize)]
struct UpdateAlertSettingsRequest {
    settings: serde_json::Value,
}

#[derive(Serialize)]
struct AlertSettingsResponse {
    vineyard_id: String,
    alert_type: String,
    settings: serde_json::Value,
    updated_at: i64,
}

// Geocode test types
#[derive(Deserialize)]
struct GeocodeTestQuery {
    location: String,
}

#[derive(Serialize)]
struct GeocodeTestResponse {
    input: String,
    is_coordinates: bool,
    resolved: String,
}

// Seasonal Task Advisor types
#[derive(Deserialize)]
struct SeasonalTasksRequest {
    user_id: String,
    week_start: i64,         // Monday timestamp (milliseconds)
    vineyard_location: Option<String>,
    varieties: Vec<String>,
}

#[derive(Serialize, Clone)]
struct SeasonalTask {
    id: String,
    priority: i32,           // 1 = highest priority
    task: String,            // What to do
    timing: String,          // When to do it
    details: String,         // How/why
    completed_at: Option<i64>,
}

#[derive(Serialize)]
struct SeasonalTasksResponse {
    season: String,          // e.g., "Late Dormant" or "Bud Break"
    tasks: Vec<SeasonalTask>,
    weather_note: Option<String>,
    context_summary: String,
    from_cache: bool,        // Whether these were from the database
}

// Helper struct for parsing AI response (without id/completed_at)
struct ParsedSeasonalTask {
    priority: i32,
    task: String,
    timing: String,
    details: String,
}

// AI Training Recommendation types
#[derive(Deserialize)]
struct TrainingRecommendationRequest {
    block_name: String,
    varieties: Vec<String>,
    location: Option<String>,
    vineyard_location: Option<String>,
    soil_type: Option<String>,
    size_acres: Option<f64>,
    vine_count: i32,
    available_labor_hours: Option<i32>,
}

#[derive(Serialize)]
struct TrainingRecommendation {
    method: String,
    method_label: String,
    confidence: String,
    reasoning: String,
}

#[derive(Serialize)]
struct TrainingRecommendationResponse {
    recommendations: Vec<TrainingRecommendation>,
    context_summary: String,
}

// RAG types for document embeddings
#[derive(Debug)]
struct RelevantChunk {
    content: String,
    source_path: String,
    #[allow(dead_code)] // Useful for debugging/future filtering
    similarity: f64,
}

// OpenAI Embedding types
#[derive(Serialize)]
struct OpenAIEmbeddingRequest {
    model: String,
    input: String,
}

#[derive(Deserialize)]
struct OpenAIEmbeddingResponse {
    data: Vec<OpenAIEmbeddingData>,
}

#[derive(Deserialize)]
struct OpenAIEmbeddingData {
    embedding: Vec<f64>,
}

// Anthropic API types
#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: i32,
    messages: Vec<AnthropicMessage>,
}

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Deserialize)]
struct AnthropicContent {
    text: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    info!("Connecting to database...");
    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    info!("Running migrations...");
    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .expect("Failed to run migrations");

    let state = AppState { db };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/weather", get(get_weather))
        .route("/alert-settings/:vineyard_id/:alert_type", get(get_alert_settings))
        .route("/alert-settings/:vineyard_id/:alert_type", post(update_alert_settings))
        .route("/ai/training-recommendation", post(get_training_recommendation))
        .route("/ai/seasonal-tasks", post(get_seasonal_tasks))
        .route("/ai/geocode-test", get(geocode_test))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .expect("PORT must be a valid number");

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Server failed to start");
}

async fn health_check(State(state): State<AppState>) -> Result<Json<HealthResponse>, StatusCode> {
    let db_status = match sqlx::query("SELECT 1")
        .fetch_one(&state.db)
        .await
    {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    Ok(Json(HealthResponse {
        status: "ok".to_string(),
        database: db_status.to_string(),
    }))
}

fn celsius_to_fahrenheit(celsius: f64) -> i32 {
    ((celsius * 9.0 / 5.0) + 32.0).round() as i32
}

fn weather_code_to_condition(code: i32) -> String {
    match code {
        0 => "CLEAR SKY",
        1 | 2 | 3 => "PARTLY CLOUDY",
        45 | 48 => "FOGGY",
        51 | 53 | 55 => "DRIZZLE",
        61 | 63 | 65 => "RAIN",
        71 | 73 | 75 => "SNOW",
        77 => "SNOW GRAINS",
        80 | 81 | 82 => "RAIN SHOWERS",
        85 | 86 => "SNOW SHOWERS",
        95 => "THUNDERSTORM",
        96 | 99 => "THUNDERSTORM WITH HAIL",
        _ => "UNKNOWN",
    }
    .to_string()
}

/// Fetch historical weather data and calculate season-appropriate metrics.
/// For fall/winter (Sep-Feb): tracks snowfall and freeze dates
/// For spring/summer (Mar-Aug): tracks GDD and last freeze
async fn fetch_seasonal_weather_context(
    latitude: f64,
    longitude: f64,
    current_month: u32,
) -> Option<SeasonalWeatherContext> {
    let client = reqwest::Client::new();
    let today = chrono::Local::now().date_naive();

    // Determine start date based on season
    let start_date = match current_month {
        // Fall/Winter: start from September 1
        9..=12 | 1..=2 => {
            let year = if current_month >= 9 { today.year() } else { today.year() - 1 };
            chrono::NaiveDate::from_ymd_opt(year, 9, 1)?
        }
        // Spring/Summer: start from March 1
        3..=8 => {
            chrono::NaiveDate::from_ymd_opt(today.year(), 3, 1)?
        }
        _ => return None,
    };

    // End date is 5 days ago (historical API has ~5 day delay)
    let end_date = today - chrono::Duration::days(5);

    if end_date <= start_date {
        return None;
    }

    let url = format!(
        "https://archive-api.open-meteo.com/v1/archive?latitude={}&longitude={}&start_date={}&end_date={}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum&timezone=auto&temperature_unit=celsius",
        latitude, longitude,
        start_date.format("%Y-%m-%d"),
        end_date.format("%Y-%m-%d")
    );

    tracing::info!("Fetching historical weather: {} to {}", start_date, end_date);

    let response = client.get(&url).send().await.ok()?;

    if !response.status().is_success() {
        tracing::warn!("Historical weather API returned {}", response.status());
        return None;
    }

    let data: HistoricalWeatherResponse = response.json().await.ok()?;

    // Calculate metrics
    let mut total_snowfall_cm = 0.0;
    let mut first_snow_date: Option<String> = None;
    let mut coldest_temp_c = f64::MAX;
    let mut coldest_date: Option<String> = None;
    let mut last_freeze_date: Option<String> = None;
    let mut gdd_base50 = 0.0;

    let freeze_threshold_c = 0.0; // 32F = 0C

    for i in 0..data.daily.time.len() {
        let date = &data.daily.time[i];
        let temp_max = data.daily.temperature_2m_max.get(i).copied().unwrap_or(0.0);
        let temp_min = data.daily.temperature_2m_min.get(i).copied().unwrap_or(0.0);
        let snowfall = data.daily.snowfall_sum.get(i).copied().unwrap_or(0.0);

        // Track snowfall
        if snowfall > 0.0 {
            total_snowfall_cm += snowfall;
            if first_snow_date.is_none() {
                first_snow_date = Some(date.clone());
            }
        }

        // Track coldest temperature
        if temp_min < coldest_temp_c {
            coldest_temp_c = temp_min;
            coldest_date = Some(date.clone());
        }

        // Track freeze dates (below 32F/0C)
        if temp_min <= freeze_threshold_c {
            last_freeze_date = Some(date.clone());
        }

        // Calculate GDD (base 50F = 10C)
        let avg_temp_c = (temp_max + temp_min) / 2.0;
        let base_c = 10.0; // 50F
        if avg_temp_c > base_c {
            gdd_base50 += avg_temp_c - base_c;
        }
    }

    // Convert to imperial
    let total_snowfall_inches = total_snowfall_cm / 2.54;
    let coldest_temp_f = if coldest_temp_c < f64::MAX {
        celsius_to_fahrenheit(coldest_temp_c)
    } else {
        32
    };

    // Convert GDD from Celsius to Fahrenheit base
    let gdd_base50_f = gdd_base50 * 1.8;

    Some(SeasonalWeatherContext {
        total_snowfall_inches,
        first_snow_date,
        coldest_temp_f,
        coldest_date,
        last_freeze_date,
        gdd_base50: gdd_base50_f,
        days_analyzed: data.daily.time.len(),
    })
}

/// Format the weather context into a human-readable string for the AI prompt
fn format_weather_context(ctx: &SeasonalWeatherContext, current_month: u32) -> String {
    let mut parts = Vec::new();

    match current_month {
        // Fall/Winter messaging
        9..=12 | 1..=2 => {
            if ctx.total_snowfall_inches > 0.1 {
                parts.push(format!(
                    "Snowfall this season: {:.1} inches (first snow: {})",
                    ctx.total_snowfall_inches,
                    ctx.first_snow_date.as_deref().unwrap_or("unknown")
                ));
            } else {
                parts.push("No snow yet this season".to_string());
            }

            if let Some(freeze_date) = &ctx.last_freeze_date {
                parts.push(format!(
                    "Last freeze (≤32°F): {} (coldest: {}°F on {})",
                    freeze_date,
                    ctx.coldest_temp_f,
                    ctx.coldest_date.as_deref().unwrap_or("unknown")
                ));
            } else {
                parts.push(format!("No hard freeze yet (coldest: {}°F)", ctx.coldest_temp_f));
            }
        }
        // Spring/Summer messaging
        3..=8 => {
            if let Some(freeze_date) = &ctx.last_freeze_date {
                parts.push(format!("Last freeze (≤32°F): {}", freeze_date));
            } else {
                parts.push("No freezes since March 1".to_string());
            }

            parts.push(format!("Growing degree days (base 50°F): {:.0}", ctx.gdd_base50));
        }
        _ => {}
    }

    if parts.is_empty() {
        return String::new();
    }

    format!("\n\nHistorical Weather Data (past {} days):\n- {}",
        ctx.days_analyzed,
        parts.join("\n- "))
}

async fn get_weather(
    State(state): State<AppState>,
    Query(params): Query<WeatherQuery>,
) -> Result<Json<WeatherResponse>, StatusCode> {
    let client = reqwest::Client::new();

    // Fetch weather data
    let weather_url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=10&timezone=auto&temperature_unit=celsius",
        params.latitude, params.longitude
    );

    let weather_response = client
        .get(&weather_url)
        .send()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    let data: OpenMeteoResponse = weather_response
        .json()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Fetch location name
    let location_url = format!(
        "https://nominatim.openstreetmap.org/reverse?lat={}&lon={}&format=json",
        params.latitude, params.longitude
    );

    let location = match client
        .get(&location_url)
        .header("User-Agent", "GilbertGrapeTracker/1.0")
        .send()
        .await
    {
        Ok(resp) => match resp.json::<NominatimResponse>().await {
            Ok(geo) => {
                let city = geo.address.city
                    .or(geo.address.town)
                    .or(geo.address.village)
                    .unwrap_or_else(|| "Unknown".to_string());
                let state = geo.address.state.unwrap_or_else(|| "".to_string());

                if state.is_empty() {
                    city.to_uppercase()
                } else {
                    format!("{}, {}", city, state).to_uppercase()
                }
            }
            Err(_) => "CURRENT LOCATION".to_string(),
        },
        Err(_) => "CURRENT LOCATION".to_string(),
    };

    let forecast: Vec<DayForecast> = data
        .daily
        .time
        .iter()
        .enumerate()
        .map(|(i, date)| {
            // Parse date to get day name (Mon, Tue, etc)
            let day = if let Ok(parsed_date) = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
                parsed_date.format("%a").to_string().to_uppercase()
            } else {
                "---".to_string()
            };

            DayForecast {
                day,
                temp_high_f: celsius_to_fahrenheit(data.daily.temperature_2m_max[i]),
                temp_low_f: celsius_to_fahrenheit(data.daily.temperature_2m_min[i]),
                weather_code: data.daily.weather_code[i],
            }
        })
        .collect();

    // Calculate alerts if vineyard_id provided
    let alerts = if let Some(vineyard_id) = &params.vineyard_id {
        calculate_weather_alerts(&state.db, vineyard_id, &forecast).await
    } else {
        Vec::new()
    };

    Ok(Json(WeatherResponse {
        current_temp_f: celsius_to_fahrenheit(data.current.temperature_2m),
        current_condition: weather_code_to_condition(data.current.weather_code),
        location,
        forecast,
        alerts,
    }))
}

async fn calculate_weather_alerts(
    db: &PgPool,
    vineyard_id: &str,
    forecast: &[DayForecast],
) -> Vec<Alert> {
    let mut alerts = Vec::new();

    // Fetch alert settings for this vineyard
    let settings_result = sqlx::query!(
        r#"
        SELECT settings
        FROM alert_settings
        WHERE vineyard_id = $1 AND alert_type = 'weather'
        "#,
        vineyard_id
    )
    .fetch_optional(db)
    .await;

    let settings = match settings_result {
        Ok(Some(row)) => row.settings,
        _ => return alerts, // No settings or error, return empty alerts
    };

    // Parse settings JSON
    let settings_obj = settings.as_object();
    if settings_obj.is_none() {
        return alerts;
    }
    let settings_obj = settings_obj.unwrap();

    // Check temperature alerts
    if let Some(temp_settings) = settings_obj.get("temperature") {
        if temp_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let high_threshold = temp_settings.get("highThreshold").and_then(|v| v.as_i64()).unwrap_or(100) as i32;
            let low_threshold = temp_settings.get("lowThreshold").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let days_out = temp_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(7) as usize;

            for day in forecast.iter().take(days_out) {
                if day.temp_high_f >= high_threshold {
                    alerts.push(Alert {
                        alert_type: "temperature_high".to_string(),
                        message: format!("HIGH TEMP: {} EXPECTED {}°F", day.day, day.temp_high_f),
                        severity: "warning".to_string(),
                    });
                }
                if day.temp_low_f <= low_threshold {
                    alerts.push(Alert {
                        alert_type: "temperature_low".to_string(),
                        message: format!("LOW TEMP: {} EXPECTED {}°F", day.day, day.temp_low_f),
                        severity: "warning".to_string(),
                    });
                }
            }
        }
    }

    // Check condition alerts (frost, snow, rain, thunderstorm, fog)
    if let Some(frost_settings) = settings_obj.get("frost") {
        if frost_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let days_out = frost_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(3) as usize;
            for day in forecast.iter().take(days_out) {
                if day.temp_low_f <= 32 {
                    alerts.push(Alert {
                        alert_type: "frost".to_string(),
                        message: format!("FROST WARNING: {} LOW {}°F", day.day, day.temp_low_f),
                        severity: "critical".to_string(),
                    });
                }
            }
        }
    }

    if let Some(snow_settings) = settings_obj.get("snow") {
        if snow_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let days_out = snow_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(7) as usize;
            for day in forecast.iter().take(days_out) {
                if day.weather_code >= 71 && day.weather_code <= 86 {
                    alerts.push(Alert {
                        alert_type: "snow".to_string(),
                        message: format!("SNOW FORECAST: {}", day.day),
                        severity: "warning".to_string(),
                    });
                }
            }
        }
    }

    if let Some(rain_settings) = settings_obj.get("rain") {
        if rain_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let days_out = rain_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(7) as usize;
            for day in forecast.iter().take(days_out) {
                if day.weather_code >= 51 && day.weather_code <= 67 {
                    alerts.push(Alert {
                        alert_type: "rain".to_string(),
                        message: format!("RAIN FORECAST: {}", day.day),
                        severity: "info".to_string(),
                    });
                }
            }
        }
    }

    if let Some(thunderstorm_settings) = settings_obj.get("thunderstorm") {
        if thunderstorm_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let days_out = thunderstorm_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(7) as usize;
            for day in forecast.iter().take(days_out) {
                if day.weather_code >= 95 && day.weather_code <= 99 {
                    alerts.push(Alert {
                        alert_type: "thunderstorm".to_string(),
                        message: format!("THUNDERSTORM FORECAST: {}", day.day),
                        severity: "warning".to_string(),
                    });
                }
            }
        }
    }

    if let Some(fog_settings) = settings_obj.get("fog") {
        if fog_settings.get("enabled").and_then(|v| v.as_bool()).unwrap_or(false) {
            let days_out = fog_settings.get("daysOut").and_then(|v| v.as_i64()).unwrap_or(7) as usize;
            for day in forecast.iter().take(days_out) {
                if day.weather_code >= 45 && day.weather_code <= 48 {
                    alerts.push(Alert {
                        alert_type: "fog".to_string(),
                        message: format!("FOG FORECAST: {}", day.day),
                        severity: "info".to_string(),
                    });
                }
            }
        }
    }

    alerts
}

async fn get_alert_settings(
    State(state): State<AppState>,
    Path((vineyard_id, alert_type)): Path<(String, String)>,
) -> Result<Json<AlertSettingsResponse>, StatusCode> {
    let result = sqlx::query!(
        r#"
        SELECT vineyard_id, alert_type, settings, updated_at
        FROM alert_settings
        WHERE vineyard_id = $1 AND alert_type = $2
        "#,
        vineyard_id,
        alert_type
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match result {
        Some(row) => Ok(Json(AlertSettingsResponse {
            vineyard_id: row.vineyard_id,
            alert_type: row.alert_type,
            settings: row.settings,
            updated_at: row.updated_at,
        })),
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn update_alert_settings(
    State(state): State<AppState>,
    Path((vineyard_id, alert_type)): Path<(String, String)>,
    Json(payload): Json<UpdateAlertSettingsRequest>,
) -> Result<Json<AlertSettingsResponse>, StatusCode> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    let result = sqlx::query!(
        r#"
        INSERT INTO alert_settings (vineyard_id, alert_type, settings, updated_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (vineyard_id, alert_type)
        DO UPDATE SET settings = $3, updated_at = $4
        RETURNING vineyard_id, alert_type, settings, updated_at
        "#,
        vineyard_id,
        alert_type,
        payload.settings,
        now
    )
    .fetch_one(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(AlertSettingsResponse {
        vineyard_id: result.vineyard_id,
        alert_type: result.alert_type,
        settings: result.settings,
        updated_at: result.updated_at,
    }))
}

async fn geocode_test(
    Query(params): Query<GeocodeTestQuery>,
) -> Result<Json<GeocodeTestResponse>, StatusCode> {
    let is_coordinates = parse_coordinates(&params.location).is_some();
    let resolved = resolve_location(&params.location).await;

    Ok(Json(GeocodeTestResponse {
        input: params.location,
        is_coordinates,
        resolved,
    }))
}

async fn get_seasonal_tasks(
    State(state): State<AppState>,
    Json(payload): Json<SeasonalTasksRequest>,
) -> Result<Json<SeasonalTasksResponse>, StatusCode> {
    // First, check if we have tasks for this week already
    let existing_tasks: Vec<(String, String, i32, String, String, String, Option<i64>)> = sqlx::query_as(
        r#"
        SELECT id, season, priority, task_name, timing, details, completed_at
        FROM seasonal_task
        WHERE user_id = $1 AND week_start = $2
        ORDER BY priority ASC
        "#
    )
    .bind(&payload.user_id)
    .bind(payload.week_start)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    if !existing_tasks.is_empty() {
        let season = existing_tasks.first().map(|t| t.1.clone()).unwrap_or_default();
        let tasks: Vec<SeasonalTask> = existing_tasks
            .into_iter()
            .map(|(id, _, priority, task_name, timing, details, completed_at)| SeasonalTask {
                id,
                priority,
                task: task_name,
                timing,
                details,
                completed_at,
            })
            .collect();

        return Ok(Json(SeasonalTasksResponse {
            season,
            tasks,
            weather_note: None,
            context_summary: "Tasks loaded from this week's recommendations".to_string(),
            from_cache: true,
        }));
    }

    // No cached tasks - generate new ones
    let anthropic_api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| {
            tracing::error!("ANTHROPIC_API_KEY not set");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let openai_api_key = std::env::var("OPENAI_API_KEY").ok();
    let client = reqwest::Client::new();

    // Convert week_start timestamp to date
    let current_date = chrono::DateTime::from_timestamp_millis(payload.week_start)
        .map(|dt| dt.date_naive())
        .unwrap_or_else(|| chrono::Local::now().date_naive());

    let month = current_date.format("%B").to_string();
    let day = current_date.day();

    // Resolve location if coordinates
    let resolved_location = match &payload.vineyard_location {
        Some(loc) if !loc.is_empty() => Some(resolve_location(loc).await),
        _ => None,
    };

    // Try to extract coordinates for historical weather lookup
    let coordinates = payload.vineyard_location
        .as_ref()
        .and_then(|loc| parse_coordinates(loc));

    // Fetch historical weather context if we have coordinates
    let weather_context = if let Some((lat, lon)) = coordinates {
        fetch_seasonal_weather_context(lat, lon, current_date.month()).await
    } else {
        None
    };

    let weather_context_str = weather_context
        .as_ref()
        .map(|ctx| format_weather_context(ctx, current_date.month()))
        .unwrap_or_default();

    // Determine approximate season based on month (Northern Hemisphere default)
    let season_hint = match current_date.month() {
        12 | 1 | 2 => "dormant season (winter)",
        3 => "late dormant to early bud break",
        4 => "bud break to early shoot growth",
        5 => "shoot growth to bloom",
        6 => "bloom to fruit set",
        7 | 8 => "veraison and ripening",
        9 | 10 => "harvest season",
        11 => "post-harvest",
        _ => "growing season",
    };

    let varieties_str = if payload.varieties.is_empty() {
        "various grape varieties".to_string()
    } else {
        payload.varieties.join(", ")
    };

    // Build context summary
    let context_parts: Vec<String> = vec![
        Some(format!("Date: {} {}", month, day)),
        Some(format!("Season: {}", season_hint)),
        resolved_location.as_ref().map(|l| format!("Location: {}", l)),
        Some(format!("Varieties: {}", varieties_str)),
    ]
    .into_iter()
    .flatten()
    .collect();

    let context_summary = context_parts.join(" • ");

    // Build RAG query
    let rag_query_text = format!(
        "vineyard tasks for {} in {}, growing {}",
        season_hint,
        resolved_location.as_deref().unwrap_or("temperate climate"),
        varieties_str
    );

    // Fetch relevant documents from knowledgebase
    let mut knowledge_context = String::new();
    if let Some(openai_key) = &openai_api_key {
        match rag_query(&state.db, &rag_query_text, openai_key, 8, None).await {
            Ok(chunks) if !chunks.is_empty() => {
                tracing::info!("RAG: Found {} relevant documents for seasonal tasks", chunks.len());
                knowledge_context = format!(
                    "\n\n## Reference Documentation\nThe following excerpts from our viticulture knowledgebase are relevant:\n\n{}",
                    chunks
                        .iter()
                        .map(|c| format!("### From: {}\n{}\n", c.source_path, c.content))
                        .collect::<Vec<_>>()
                        .join("\n---\n")
                );
            }
            Ok(_) => {
                tracing::info!("RAG: No relevant documents found for seasonal tasks");
            }
            Err(e) => {
                tracing::warn!("RAG query failed for seasonal tasks: {:?}", e);
            }
        }
    }

    let prompt = format!(
        r#"You are a viticulture expert helping a home vineyard grower understand what tasks they should be doing right now.

Context:
- Current date: {} {}
- Approximate season: {}
- Location: {}
- Varieties grown: {}
{}{}

Based on this timing, historical weather data, and the reference documentation, provide a prioritized list of 3-5 vineyard tasks the grower should focus on right now.

Respond with JSON in this exact format:
{{
  "season": "Name of current growth stage (e.g., 'Late Dormant', 'Bud Break', 'Bloom')",
  "tasks": [
    {{
      "priority": 1,
      "task": "Short task name",
      "timing": "When to do this - use ACTUAL weather conditions if available (e.g., 'This week since no snow yet', 'Completed - frost already occurred')",
      "details": "1-2 sentence explanation of what to do and why, referencing actual conditions when relevant"
    }}
  ],
  "weather_note": "Optional note about weather considerations based on actual historical data, or null if not applicable"
}}

Important guidelines:
1. Tasks should be actionable and specific to this time of year
2. Consider the varieties - some have specific needs
3. Prioritize by urgency - what must be done now vs. can wait
4. Use the historical weather data to give accurate timing advice (e.g., if snow has already fallen, don't say "before first snow")
5. Reference the documentation for timing cues (e.g., soil temperature, phenological stages)
6. For home growers, focus on essential tasks rather than commercial-scale operations"#,
        month, day,
        season_hint,
        resolved_location.as_deref().unwrap_or("unspecified location"),
        varieties_str,
        weather_context_str,
        knowledge_context
    );

    let request = AnthropicRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 1500,
        messages: vec![AnthropicMessage {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &anthropic_api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to call Anthropic API for seasonal tasks: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        tracing::error!("Anthropic API error for seasonal tasks: {} - {}", status, body);
        return Err(StatusCode::BAD_GATEWAY);
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse Anthropic response for seasonal tasks: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let ai_text = anthropic_response
        .content
        .first()
        .map(|c| c.text.clone())
        .unwrap_or_default();

    // Parse the JSON response
    let (season, parsed_tasks, weather_note) = parse_seasonal_tasks_response(&ai_text);

    // Store tasks in database
    let now = chrono::Utc::now().timestamp_millis();
    let mut stored_tasks: Vec<SeasonalTask> = Vec::new();

    for task in parsed_tasks {
        let id = uuid::Uuid::new_v4().to_string();

        let result = sqlx::query(
            r#"
            INSERT INTO seasonal_task (id, user_id, week_start, season, priority, task_name, timing, details, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#
        )
        .bind(&id)
        .bind(&payload.user_id)
        .bind(payload.week_start)
        .bind(&season)
        .bind(task.priority)
        .bind(&task.task)
        .bind(&task.timing)
        .bind(&task.details)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;

        if let Err(e) = result {
            tracing::warn!("Failed to store seasonal task: {}", e);
        }

        stored_tasks.push(SeasonalTask {
            id,
            priority: task.priority,
            task: task.task,
            timing: task.timing,
            details: task.details,
            completed_at: None,
        });
    }

    Ok(Json(SeasonalTasksResponse {
        season,
        tasks: stored_tasks,
        weather_note,
        context_summary,
        from_cache: false,
    }))
}

fn parse_seasonal_tasks_response(text: &str) -> (String, Vec<ParsedSeasonalTask>, Option<String>) {
    let json_start = text.find('{');
    let json_end = text.rfind('}');

    if let (Some(start), Some(end)) = (json_start, json_end) {
        let json_str = &text[start..=end];
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
            let season = parsed.get("season")
                .and_then(|s| s.as_str())
                .unwrap_or("Growing Season")
                .to_string();

            let weather_note = parsed.get("weather_note")
                .and_then(|w| w.as_str())
                .map(|s| s.to_string());

            let tasks = parsed.get("tasks")
                .and_then(|t| t.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|t| {
                            Some(ParsedSeasonalTask {
                                priority: t.get("priority")?.as_i64()? as i32,
                                task: t.get("task")?.as_str()?.to_string(),
                                timing: t.get("timing")?.as_str()?.to_string(),
                                details: t.get("details")?.as_str()?.to_string(),
                            })
                        })
                        .collect()
                })
                .unwrap_or_default();

            return (season, tasks, weather_note);
        }
    }

    // Fallback
    (
        "Growing Season".to_string(),
        vec![ParsedSeasonalTask {
            priority: 1,
            task: "Monitor your vineyard".to_string(),
            timing: "Regularly".to_string(),
            details: "Walk your vineyard weekly to observe vine health and development.".to_string(),
        }],
        None,
    )
}

async fn get_training_recommendation(
    State(state): State<AppState>,
    Json(payload): Json<TrainingRecommendationRequest>,
) -> Result<Json<TrainingRecommendationResponse>, StatusCode> {
    let anthropic_api_key = std::env::var("ANTHROPIC_API_KEY")
        .map_err(|_| {
            tracing::error!("ANTHROPIC_API_KEY not set");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    // Check for OpenAI key for RAG (optional - will work without it)
    let openai_api_key = std::env::var("OPENAI_API_KEY").ok();

    let client = reqwest::Client::new();

    // Resolve vineyard location (geocode if coordinates)
    let resolved_location = match &payload.vineyard_location {
        Some(loc) if !loc.is_empty() => Some(resolve_location(loc).await),
        _ => None,
    };

    // Build context for the AI
    let varieties_str = if payload.varieties.is_empty() {
        "unknown varieties".to_string()
    } else {
        payload.varieties.join(", ")
    };

    let context_parts: Vec<String> = vec![
        Some(format!("Block: {}", payload.block_name)),
        Some(format!("Varieties: {}", varieties_str)),
        Some(format!("Vine count: {}", payload.vine_count)),
        resolved_location.as_ref().map(|l| format!("Vineyard location: {}", l)),
        payload.location.as_ref().map(|l| format!("Block position: {}", l)),
        payload.soil_type.as_ref().map(|s| format!("Soil type: {}", s)),
        payload.size_acres.map(|a| format!("Size: {} acres", a)),
        payload.available_labor_hours.map(|h| format!("Labor hours/week: {}", h)),
    ]
    .into_iter()
    .flatten()
    .collect();

    let context_summary = context_parts.join(" • ");

    // Build RAG query from context
    let rag_query_text = format!(
        "training system selection for {} grape varieties, vineyard with {} vines{}{}",
        varieties_str,
        payload.vine_count,
        resolved_location.as_ref().map(|l| format!(", {}", l)).unwrap_or_default(),
        payload.soil_type.as_ref().map(|s| format!(", {} soil", s)).unwrap_or_default()
    );

    // Fetch relevant documents from knowledgebase (if OpenAI key available)
    let mut knowledge_context = String::new();
    if let Some(openai_key) = &openai_api_key {
        match rag_query(&state.db, &rag_query_text, openai_key, 5, None).await {
            Ok(chunks) if !chunks.is_empty() => {
                tracing::info!("RAG: Found {} relevant documents", chunks.len());
                knowledge_context = format!(
                    "\n\n## Reference Documentation\nThe following excerpts from our viticulture knowledgebase are relevant to this recommendation:\n\n{}",
                    chunks
                        .iter()
                        .map(|c| format!("### From: {}\n{}\n", c.source_path, c.content))
                        .collect::<Vec<_>>()
                        .join("\n---\n")
                );
            }
            Ok(_) => {
                tracing::info!("RAG: No relevant documents found (embeddings may not be populated yet)");
            }
            Err(e) => {
                tracing::warn!("RAG query failed (continuing without): {:?}", e);
            }
        }
    } else {
        tracing::info!("RAG: Skipping (OPENAI_API_KEY not set)");
    }

    let prompt = format!(
        r#"You are a viticulture expert helping a home vineyard grower choose a training method for their grape vines.

Context about this vineyard block:
{}
{}

Available training methods (use these exact codes):
- HEAD_TRAINING: Head Training (Goblet) - Traditional bush vine, no trellis needed
- BILATERAL_CORDON: Bilateral Cordon - Two permanent arms on a wire
- VERTICAL_CORDON: Vertical Cordon - Single vertical trunk with horizontal arms
- FOUR_ARM_KNIFFEN: Four-Arm Kniffen - Simple, low-maintenance system
- GENEVA_DOUBLE_CURTAIN: Geneva Double Curtain (GDC) - High-vigor vine management
- UMBRELLA_KNIFFEN: Umbrella Kniffen - Arching canes from high head
- CANE_PRUNED: Cane Pruned (Guyot) - Annual cane renewal
- VSP: Vertical Shoot Positioning - Most common commercial system
- SCOTT_HENRY: Scott-Henry - Divided canopy for high vigor
- LYRE: Lyre (U-Shape) - Open canopy for air circulation

Respond with exactly 3 recommendations in this JSON format:
{{
  "recommendations": [
    {{
      "method": "METHOD_CODE",
      "method_label": "Human Readable Name",
      "confidence": "high" or "medium" or "low",
      "reasoning": "Brief 1-2 sentence explanation"
    }}
  ]
}}

Consider:
1. The grape varieties being grown and their vigor characteristics
2. Climate zone - infer from vineyard location (coordinates or place name) if provided. Consider Mediterranean, Continental, Maritime, High-Desert, or Humid-Subtropical climates.
3. Soil type and vigor implications
4. Available labor hours - fewer hours means simpler, low-maintenance systems are preferred
5. Any specific guidance from the reference documentation above

Provide practical recommendations suitable for a home vineyard. For limited labor availability, favor simpler systems like Head Training or Four-Arm Kniffen."#,
        context_parts.join("\n"),
        knowledge_context
    );

    let request = AnthropicRequest {
        model: "claude-3-5-haiku-20241022".to_string(),
        max_tokens: 1024,
        messages: vec![AnthropicMessage {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &anthropic_api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to call Anthropic API: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        tracing::error!("Anthropic API error: {} - {}", status, body);
        return Err(StatusCode::BAD_GATEWAY);
    }

    let anthropic_response: AnthropicResponse = response
        .json()
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse Anthropic response: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let ai_text = anthropic_response
        .content
        .first()
        .map(|c| c.text.clone())
        .unwrap_or_default();

    // Parse the JSON from AI response
    let recommendations = parse_ai_recommendations(&ai_text);

    Ok(Json(TrainingRecommendationResponse {
        recommendations,
        context_summary,
    }))
}

fn parse_ai_recommendations(text: &str) -> Vec<TrainingRecommendation> {
    // Try to extract JSON from the response
    let json_start = text.find('{');
    let json_end = text.rfind('}');

    if let (Some(start), Some(end)) = (json_start, json_end) {
        let json_str = &text[start..=end];
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(recs) = parsed.get("recommendations").and_then(|r| r.as_array()) {
                return recs
                    .iter()
                    .filter_map(|r| {
                        Some(TrainingRecommendation {
                            method: r.get("method")?.as_str()?.to_string(),
                            method_label: r.get("method_label")?.as_str()?.to_string(),
                            confidence: r.get("confidence")?.as_str()?.to_string(),
                            reasoning: r.get("reasoning")?.as_str()?.to_string(),
                        })
                    })
                    .collect();
            }
        }
    }

    // Fallback if parsing fails
    vec![TrainingRecommendation {
        method: "VSP".to_string(),
        method_label: "Vertical Shoot Positioning".to_string(),
        confidence: "medium".to_string(),
        reasoning: "VSP is a versatile, widely-used system suitable for most grape varieties and manageable for home growers.".to_string(),
    }]
}

/// Check if a string looks like coordinates (e.g., "38.2975,-122.2869" or "38.2975, -122.2869")
fn parse_coordinates(location: &str) -> Option<(f64, f64)> {
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    if parts.len() != 2 {
        return None;
    }

    let lat = parts[0].parse::<f64>().ok()?;
    let lon = parts[1].parse::<f64>().ok()?;

    // Validate ranges
    if lat >= -90.0 && lat <= 90.0 && lon >= -180.0 && lon <= 180.0 {
        Some((lat, lon))
    } else {
        None
    }
}

/// Reverse geocode coordinates to a human-readable location name
async fn geocode_coordinates(lat: f64, lon: f64) -> Option<String> {
    let client = reqwest::Client::new();
    let location_url = format!(
        "https://nominatim.openstreetmap.org/reverse?lat={}&lon={}&format=json",
        lat, lon
    );

    match client
        .get(&location_url)
        .header("User-Agent", "GilbertGrapeTracker/1.0")
        .send()
        .await
    {
        Ok(resp) => match resp.json::<NominatimResponse>().await {
            Ok(geo) => {
                let city = geo.address.city
                    .or(geo.address.town)
                    .or(geo.address.village)?;
                let state = geo.address.state?;
                Some(format!("{}, {}", city, state))
            }
            Err(_) => None,
        },
        Err(_) => None,
    }
}

/// Resolve a location string - if it's coordinates, geocode it; otherwise return as-is
async fn resolve_location(location: &str) -> String {
    if let Some((lat, lon)) = parse_coordinates(location) {
        if let Some(resolved) = geocode_coordinates(lat, lon).await {
            tracing::info!("Geocoded {} to {}", location, resolved);
            return resolved;
        }
    }
    location.to_string()
}

/// Generate an embedding for the given text using OpenAI's API
async fn generate_query_embedding(text: &str, api_key: &str) -> Result<Vec<f64>, StatusCode> {
    let client = reqwest::Client::new();

    let request = OpenAIEmbeddingRequest {
        model: "text-embedding-3-small".to_string(),
        input: text.to_string(),
    };

    let response = client
        .post("https://api.openai.com/v1/embeddings")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to call OpenAI embeddings API: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        tracing::error!("OpenAI API error: {} - {}", status, body);
        return Err(StatusCode::BAD_GATEWAY);
    }

    let embedding_response: OpenAIEmbeddingResponse = response
        .json()
        .await
        .map_err(|e| {
            tracing::error!("Failed to parse OpenAI response: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    embedding_response
        .data
        .first()
        .map(|d| d.embedding.clone())
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)
}

/// Query the doc_embeddings table for similar documents
async fn query_similar_documents(
    db: &PgPool,
    query_embedding: &[f64],
    limit: i32,
    category_filter: Option<&str>,
) -> Result<Vec<RelevantChunk>, StatusCode> {
    // Format embedding as PostgreSQL vector literal
    let embedding_str = format!(
        "[{}]",
        query_embedding
            .iter()
            .map(|f| f.to_string())
            .collect::<Vec<_>>()
            .join(",")
    );

    // Build query with optional category filter
    // Using query_scalar/fetch_all with manual Row handling to avoid compile-time schema check
    let query = if category_filter.is_some() {
        format!(
            r#"
            SELECT
                content,
                source_path,
                1 - (embedding <=> $1::vector) as similarity
            FROM doc_embeddings
            WHERE metadata->>'category' = $3
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            "#
        )
    } else {
        format!(
            r#"
            SELECT
                content,
                source_path,
                1 - (embedding <=> $1::vector) as similarity
            FROM doc_embeddings
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            "#
        )
    };

    let results: Result<Vec<(String, String, f64)>, _> = if let Some(category) = category_filter {
        sqlx::query_as(&query)
            .bind(&embedding_str)
            .bind(limit)
            .bind(category)
            .fetch_all(db)
            .await
    } else {
        sqlx::query_as(&query)
            .bind(&embedding_str)
            .bind(limit)
            .fetch_all(db)
            .await
    };

    match results {
        Ok(rows) => Ok(rows
            .into_iter()
            .map(|(content, source_path, similarity)| RelevantChunk {
                content,
                source_path,
                similarity,
            })
            .collect()),
        Err(e) => {
            tracing::warn!("Failed to query similar documents: {}", e);
            // Return empty vec instead of error - RAG is optional enhancement
            Ok(Vec::new())
        }
    }
}

/// Perform RAG query: embed the question and retrieve relevant documents
async fn rag_query(
    db: &PgPool,
    query: &str,
    openai_api_key: &str,
    limit: i32,
    category_filter: Option<&str>,
) -> Result<Vec<RelevantChunk>, StatusCode> {
    let embedding = generate_query_embedding(query, openai_api_key).await?;
    query_similar_documents(db, &embedding, limit, category_filter).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_coordinates_valid() {
        // Standard format
        let result = parse_coordinates("38.2975,-122.2869");
        assert!(result.is_some());
        let (lat, lon) = result.unwrap();
        assert!((lat - 38.2975).abs() < 0.0001);
        assert!((lon - (-122.2869)).abs() < 0.0001);
    }

    #[test]
    fn test_parse_coordinates_with_spaces() {
        // With space after comma
        let result = parse_coordinates("38.2975, -122.2869");
        assert!(result.is_some());
        let (lat, lon) = result.unwrap();
        assert!((lat - 38.2975).abs() < 0.0001);
        assert!((lon - (-122.2869)).abs() < 0.0001);
    }

    #[test]
    fn test_parse_coordinates_with_extra_spaces() {
        // With spaces around both numbers
        let result = parse_coordinates(" 38.2975 , -122.2869 ");
        assert!(result.is_some());
    }

    #[test]
    fn test_parse_coordinates_negative_lat() {
        // Southern hemisphere
        let result = parse_coordinates("-33.9, 18.4");
        assert!(result.is_some());
        let (lat, lon) = result.unwrap();
        assert!((lat - (-33.9)).abs() < 0.0001);
        assert!((lon - 18.4).abs() < 0.0001);
    }

    #[test]
    fn test_parse_coordinates_invalid_place_name() {
        // Place name should not parse as coordinates
        let result = parse_coordinates("Napa Valley");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_coordinates_invalid_single_number() {
        let result = parse_coordinates("38.2975");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_coordinates_invalid_too_many_parts() {
        let result = parse_coordinates("38.2975,-122.2869,100");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_coordinates_invalid_out_of_range_lat() {
        // Latitude > 90
        let result = parse_coordinates("91.0,-122.0");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_coordinates_invalid_out_of_range_lon() {
        // Longitude > 180
        let result = parse_coordinates("38.0,-181.0");
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_coordinates_edge_cases() {
        // Valid edge cases
        assert!(parse_coordinates("90.0,180.0").is_some());
        assert!(parse_coordinates("-90.0,-180.0").is_some());
        assert!(parse_coordinates("0,0").is_some());
    }

    #[test]
    fn test_parse_coordinates_invalid_text_mixed() {
        let result = parse_coordinates("38.2975, California");
        assert!(result.is_none());
    }
}
