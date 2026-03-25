FROM python:3.12-slim

WORKDIR /app

COPY requirements.cpu.txt .
RUN pip install --no-cache-dir -r requirements.cpu.txt

COPY . .

EXPOSE 4004

CMD ["python", "src/main.py"]