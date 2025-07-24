from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow import keras
import numpy as np
import json

app = Flask(__name__)
CORS(app)

# Load the model and label classes
model = keras.models.load_model('my_model.h5')
with open('label_classes.json', 'r') as f:
    label_classes = json.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    # Expecting a flat list of 63 numbers
    landmarks = data.get('landmarks')
    if not landmarks or len(landmarks) != 63:
        return jsonify({'error': 'Invalid input'}), 400
    X = np.array(landmarks).reshape(1, -1)
    pred = model.predict(X)
    pred_idx = int(np.argmax(pred, axis=1)[0])
    label = label_classes[pred_idx]
    return jsonify({'prediction': label})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 