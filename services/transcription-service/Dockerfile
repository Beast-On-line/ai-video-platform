FROM python:3.12-slim

WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY requirements.cpu.txt .
RUN pip install --no-cache-dir -r requirements.cpu.txt

COPY . .

CMD ["python", "src/main.py"]