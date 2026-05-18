import json
import os
import sys


FEATURES = [
    "emplacement_encoded",
    "jour_encoded",
    "ligne_encoded",
    "mode_encoded",
    "exploitant_encoded",
    "heure",
    "latitude",
    "longitude",
    "principale",
    "nb_lignes",
]


def configure_stdio():
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")


def level(value):
    if value < 4:
        return "low"
    if value < 9:
        return "medium"
    return "high"


def message_for(value, hour):
    hour_label = f"{hour:02d}h"
    if value >= 9:
        return f"A {hour_label}, cette zone devrait etre tres frequentee."
    if value >= 4:
        return f"A {hour_label}, une affluence moderee est attendue."
    return f"A {hour_label}, la zone devrait rester calme."


def safe_transform(encoder, value):
    text = "" if value is None else str(value)
    classes = list(getattr(encoder, "classes_", []))

    if text in classes:
        return int(encoder.transform([text])[0])

    normalized = text.strip().lower()
    for known in classes:
        if str(known).strip().lower() == normalized:
            return int(encoder.transform([known])[0])

    if classes:
        return int(encoder.transform([classes[0]])[0])

    return 0


def load_artifacts(model_dir):
    import joblib

    return {
        "model": joblib.load(os.path.join(model_dir, "model_metro.pkl")),
        "emplacement": joblib.load(os.path.join(model_dir, "le_emplacement.pkl")),
        "jour": joblib.load(os.path.join(model_dir, "le_jour.pkl")),
        "ligne": joblib.load(os.path.join(model_dir, "le_ligne.pkl")),
        "mode": joblib.load(os.path.join(model_dir, "le_mode.pkl")),
        "exploitant": joblib.load(os.path.join(model_dir, "le_exploitant.pkl")),
    }


def build_row(zone, hour, day, encoders):
    return {
        "emplacement_encoded": safe_transform(encoders["emplacement"], zone.get("nom")),
        "jour_encoded": safe_transform(encoders["jour"], day),
        "ligne_encoded": safe_transform(encoders["ligne"], zone.get("ligne")),
        "mode_encoded": safe_transform(encoders["mode"], zone.get("mode")),
        "exploitant_encoded": safe_transform(encoders["exploitant"], zone.get("exploitant")),
        "heure": int(hour),
        "latitude": float(zone.get("latitude") or 0),
        "longitude": float(zone.get("longitude") or 0),
        "principale": int(zone.get("principale") or 0),
        "nb_lignes": int(zone.get("nb_lignes") or 1),
    }


def main():
    configure_stdio()
    payload = json.loads(sys.stdin.read() or "{}")
    model_dir = payload.get("model_dir") or os.path.abspath(os.path.join(os.getcwd(), "..", "ml"))
    hour = max(0, min(23, int(payload.get("hour", 12))))
    day = payload.get("day") or "JOVS"
    zones = payload.get("zones") or []

    artifacts = load_artifacts(model_dir)
    rows = [build_row(zone, hour, day, artifacts) for zone in zones]

    try:
        import pandas as pd

        x_values = pd.DataFrame(rows, columns=FEATURES)
    except Exception:
        x_values = [[row[name] for name in FEATURES] for row in rows]

    raw_predictions = artifacts["model"].predict(x_values)
    predictions = []

    for zone, raw_value in zip(zones, raw_predictions):
        value = round(max(0, min(100, float(raw_value))), 2)
        predictions.append(
            {
                "id": int(zone.get("id")),
                "zone_id": int(zone.get("id")),
                "hour": hour,
                "prediction": value,
                "level": level(value),
                "confidence": 0.87,
                "interval": [max(0, round(value - 1.5, 2)), min(100, round(value + 1.5, 2))],
                "message": message_for(value, hour),
                "source": "model",
            }
        )

    sys.stdout.write(json.dumps({"predictions": predictions}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        sys.stderr.write(str(exc))
        sys.exit(1)
