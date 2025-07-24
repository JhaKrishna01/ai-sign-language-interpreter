import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from tensorflow import keras
model = keras.Sequential([keras.layers.Input(shape=(3,)), keras.layers.Dense(1)])
model.save('test_model.h5')
#import tensorflowjs as tfjs

# Use the full path or a relative path if running from the project root
file_path = r"C:\Users\KRISHNSA JHA\OneDrive - vitap.ac.in\Desktop\cursor project\web dev project 1\ai-sign-language-interpreter\data\sign_language_dataset_augmented.json"

with open(file_path, 'r') as f:
    dataset = json.load(f)

# Print the first sample to check the structure
print(dataset[0])

# 2. Flatten landmarks and extract labels
X = []
y = []
for sample in dataset:
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

# 9. Save model in HDF5 format for later conversion
print("Saving model as my_model.h5 for TensorFlow.js conversion...")
model.save('my_model.h5')
print("Done! Now use the Node.js tensorflowjs_converter to convert this file to tfjs format.") 