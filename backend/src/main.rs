use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
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
    country: Option<String>,
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
