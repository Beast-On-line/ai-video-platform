FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir sentence-transformers
COPY requirements.cpu.txt .
RUN pip install --no-cache-dir -r requirements.cpu.txt
COPY . .
EXPOSE 4004
CMD ["python", "src/main.py"]