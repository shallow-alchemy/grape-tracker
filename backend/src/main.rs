use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
    routing::get,
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

#[derive(Serialize)]
struct WeatherResponse {
    current_temp_f: i32,
    current_condition: String,
    forecast: Vec<DayForecast>,
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

async fn get_weather(Query(params): Query<WeatherQuery>) -> Result<Json<WeatherResponse>, StatusCode> {
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={}&longitude={}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=10&timezone=auto&temperature_unit=celsius",
        params.latitude, params.longitude
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    let data: OpenMeteoResponse = response
        .json()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

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

    Ok(Json(WeatherResponse {
        current_temp_f: celsius_to_fahrenheit(data.current.temperature_2m),
        current_condition: weather_code_to_condition(data.current.weather_code),
        forecast,
    }))
}
