use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
pub struct RequestEnvelope {
    pub id: Value,
    pub method: String,
    #[serde(default = "empty_object")]
    pub params: Value,
}

fn empty_object() -> Value {
    Value::Object(Default::default())
}

#[derive(Debug, Serialize)]
pub struct ResponseEnvelope {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub id: Value,
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<Value>,
}

pub fn event_message(event: &str, payload: Value) -> Value {
    json!({
        "type": "event",
        "event": event,
        "payload": payload
    })
}

pub fn ok_response(id: Value, result: Value) -> ResponseEnvelope {
    ResponseEnvelope {
        kind: "response",
        id,
        ok: true,
        result: Some(result),
        error: None,
    }
}

pub fn error_response(id: Value, code: &str, message: String) -> ResponseEnvelope {
    ResponseEnvelope {
        kind: "response",
        id,
        ok: false,
        result: None,
        error: Some(json!({
            "code": code,
            "message": message
        })),
    }
}

pub fn invalid_params(id: Value, message: String) -> ResponseEnvelope {
    error_response(id, "INVALID_PARAMS", message)
}
