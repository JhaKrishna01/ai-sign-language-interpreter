import json
from collections import Counter

# Load the dataset
with open('sign_language_dataset.json', 'r') as f:
    data = json.load(f)

# Count the number of samples for each label
labels = [entry['label'] for entry in data]
label_counts = Counter(labels)

# Print the class distribution
print('Class distribution:')
for label, count in label_counts.items():
    print(f'{label}: {count}') 