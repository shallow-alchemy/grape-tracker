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
        payload.vineyard_location.as_ref().map(|l| format!("Vineyard location: {}", l)),
        payload.location.as_ref().map(|l| format!("Block position: {}", l)),
        payload.soil_type.as_ref().map(|s| format!("Soil type: {}", s)),
        payload.size_acres.map(|a| format!("Size: {} acres", a)),
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
        payload.vineyard_location.as_ref().map(|l| format!(", {}", l)).unwrap_or_default(),
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
3. Ease of management for home growers
4. Soil type and vigor implications
5. Any specific guidance from the reference documentation above

Provide practical recommendations suitable for a home vineyard."#,
        context_parts.join("\n"),
        knowledge_context
    );

    let request = AnthropicRequest {
        model: "claude-sonnet-4-5-20250929".to_string(), // Temporarily using Sonnet 4.5 for testing (switch back to claude-3-5-haiku-20241022 for cost)
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
