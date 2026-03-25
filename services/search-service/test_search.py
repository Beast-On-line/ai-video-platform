import sys
sys.path.insert(0, 'src')

from dotenv import load_dotenv
load_dotenv()

from services.search_service import search_segments

print("\n--- Search: 'watermelon' ---")
results = search_segments("watermelon")
for r in results:
    print(f"[{r['start_time']:.1f}s] {r['text']} (similarity: {r['similarity']})")

print("\n--- Search: 'happiness and success' ---")
results = search_segments("happiness and success")
for r in results:
    print(f"[{r['start_time']:.1f}s] {r['text']} (similarity: {r['similarity']})")

print("\n--- Search: 'lesson from the master' ---")
results = search_segments("lesson from the master")
for r in results:
    print(f"[{r['start_time']:.1f}s] {r['text']} (similarity: {r['similarity']})")