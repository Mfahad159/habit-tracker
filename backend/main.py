from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Initialize FastAPI
app = FastAPI(title="Habit Tracker API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase
cred = credentials.Certificate("firebase-credentials.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Data Models
class HabitBase(BaseModel):
    name: str
    description: Optional[str] = None

class Habit(HabitBase):
    id: Optional[str] = None
    created_at: Optional[str] = None
    streak: int = 0
    last_completed: Optional[str] = None

# API Routes
@app.get("/")
def read_root():
    return {"message": "Hello World! Firebase is connected"}

@app.post("/habits/", response_model=Habit)
async def create_habit(habit: HabitBase):
    try:
        doc_ref = db.collection('habits').document()
        habit_data = {
            "name": habit.name,
            "description": habit.description,
            "created_at": datetime.now().isoformat(),
            "streak": 0,
            "last_completed": None
        }
        doc_ref.set(habit_data)
        return {**habit_data, "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/habits/", response_model=List[Habit])
async def get_habits():
    try:
        habits = []
        docs = db.collection('habits').stream()
        for doc in docs:
            habits.append(Habit(**doc.to_dict(), id=doc.id))
        return habits
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str):
    try:
        doc_ref = db.collection('habits').document(habit_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Habit not found")
        
        habit_data = doc.to_dict()
        last_completed = habit_data.get('last_completed')
        current_date = datetime.now().date()
        
        # Update streak logic
        if last_completed:
            last_date = datetime.fromisoformat(last_completed).date()
            if (current_date - last_date).days == 1:
                habit_data['streak'] += 1
            elif (current_date - last_date).days > 1:
                habit_data['streak'] = 1
        else:
            habit_data['streak'] = 1
            
        habit_data['last_completed'] = current_date.isoformat()
        doc_ref.update(habit_data)
        return {"message": "Habit completed", "streak": habit_data['streak']}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))