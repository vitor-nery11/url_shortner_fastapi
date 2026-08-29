from fastapi import FastAPI

app = FastAPI(
  title='URL Shortner API',
  descriptions='API para encurtamento de url',
  version='1.0.0'
)

@app.get('/')
def root():
    return {'message':'URL shortner API'}



