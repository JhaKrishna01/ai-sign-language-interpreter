import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow import keras
import tensorflowjs as tfjs

# 1. Load dataset
with open('sign_language_dataset.json', 'r') as f:
    data = json.load(f)

# 2. Flatten landmarks and extract labels
X = []
y = []
for sample in data:
    # Each sample['landmarks'] is a list of 21 dicts with x, y, z
    flat = []
    for lm in sample['landmarks']:
        flat.extend([lm['x'], lm['y'], lm['z']])
    X.append(flat)
    y.append(sample['label'])
X = np.array(X)
y = np.array(y)

# 3. Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# 4. Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

# 5. Build a simple neural network
model = keras.Sequential([
    keras.layers.Input(shape=(63,)),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(32, activation='relu'),
    keras.layers.Dense(len(le.classes_), activation='softmax')
])
model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# 6. Train
model.fit(X_train, y_train, epochs=30, batch_size=16, validation_split=0.1)

# 7. Evaluate
loss, acc = model.evaluate(X_test, y_test)
print(f"Test accuracy: {acc:.2f}")

# 8. Save label encoder classes for use in the app
with open('label_classes.json', 'w') as f:
    json.dump(le.classes_.tolist(), f)

# 9. Export to TensorFlow.js format
# This will create a 'tfjs_model' directory
print("Exporting model to TensorFlow.js format...")
tfjs.converters.save_keras_model(model, 'tfjs_model')
print("Done! Upload the 'tfjs_model' folder and 'label_classes.json' to your web app.") 