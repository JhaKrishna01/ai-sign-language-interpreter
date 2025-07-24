import json
import random
import copy

# Parameters
AUGMENT_CLASSES = ["A (Fist)", "C (C-shape)", "V (Peace)", "L (L-shape)"]
TARGET_COUNT = 135  # Match the largest class
NOISE_LEVEL = 0.01  # Adjust as needed

# Load dataset
with open('sign_language_dataset.json', 'r') as f:
    data = json.load(f)

# Group samples by label
class_samples = {}
for entry in data:
    class_samples.setdefault(entry['label'], []).append(entry)

augmented_data = copy.deepcopy(data)

for label in AUGMENT_CLASSES:
    samples = class_samples.get(label, [])
    n_to_add = TARGET_COUNT - len(samples)
    if n_to_add > 0 and samples:
        for _ in range(n_to_add):
            base = random.choice(samples)
            new_entry = copy.deepcopy(base)
            # Add small random noise to each landmark
            for lm in new_entry['landmarks']:
                lm['x'] += random.uniform(-NOISE_LEVEL, NOISE_LEVEL)
                lm['y'] += random.uniform(-NOISE_LEVEL, NOISE_LEVEL)
                lm['z'] += random.uniform(-NOISE_LEVEL, NOISE_LEVEL)
            augmented_data.append(new_entry)
        print(f"Augmented {label}: added {n_to_add} samples.")
    else:
        print(f"No augmentation needed for {label}.")

# Save the new dataset
with open('sign_language_dataset_augmented.json', 'w') as f:
    json.dump(augmented_data, f, indent=2)

print("Augmentation complete. Saved as sign_language_dataset_augmented.json.") 