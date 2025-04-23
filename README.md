# 🎯 Smart Habit Tracker

A simple yet powerful habit tracking app that helps you build better habits, one day at a time. Built with love using React and Firebase.

![Habit Tracker Demo] 

## ✨ What's Inside?

- Create and track daily habits
- Build and maintain streaks
- See your progress in real-time
- Beautiful, mobile-friendly design
- Smooth animations and transitions

## 🛠️ Quick Start

### Basic Requirements
- Node.js (any recent version will work)
- A Firebase account (it's free!)
- A modern web browser

### Step 1: Get the Code
```bash
# Clone this repository
git clone https://github.com/yourusername/habit-tracker.git

# Move into the project directory
cd habit-tracker/frontend
```

### Step 2: Install Dependencies
```bash
# Install all required packages
npm install
```

### Step 3: Firebase Setup

1. **Create a Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Name it "habit-tracker" (or whatever you prefer)
   - Follow the setup wizard

2. **Enable Firestore**
   - In your Firebase Console, click "Firestore Database"
   - Click "Create Database"
   - Choose "Start in test mode"
   - Select a location close to you

3. **Get Your Firebase Config**
   - In Firebase Console, click the gear icon ⚙️
   - Select "Project settings"
   - Scroll down to "Your apps"
   - Click the web icon (</>)
   - Register your app with a nickname
   - Copy the configuration object

4. **Update Firebase Config**
   - Open `frontend/src/firebase.js`
   - Replace the placeholder config with your actual Firebase config:
   ```javascript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };
   ```

### Step 4: Run the App
```bash
# Start the development server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. You should see the app running! 🎉

## 🏗️ Project Structure

```
habit-tracker/
├── frontend/              # React frontend
│   ├── public/           # Static files
│   ├── src/              # Source code
│   │   ├── App.js        # Main app component
│   │   ├── firebase.js   # Firebase configuration
│   │   └── ...           # Other components
│   └── package.json      # Dependencies
```

## 🎨 Features

### Habit Tracking
- Add new habits with a name and description
- Mark habits as complete for the day
- Track your streak (how many days in a row you've completed the habit)
- See all your habits in one place

### Statistics
- Total number of habits
- Current streaks
- Daily completion rate
- Progress over time

### Real-time Updates
- Changes appear instantly
- No need to refresh the page
- Works across multiple devices

## 🤝 Contributing

Found a bug? Have an idea for a new feature? We'd love your help!

1. Fork the project
2. Create your feature branch (`git checkout -b cool-new-feature`)
3. Make your changes
4. Push to the branch (`git push origin cool-new-feature`)
5. Open a Pull Request


## ❓ Need Help?

If you run into any issues:
1. Check the browser console for errors
2. Make sure Firebase is properly configured
3. Try clearing your browser cache
4. Still stuck? Open an issue on GitHub!

---

Made with ❤️ by Main Fahad