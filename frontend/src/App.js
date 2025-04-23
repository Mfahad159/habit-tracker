import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  Card, CardContent, Alert, CircularProgress, Snackbar,
  AppBar, Toolbar, Tabs, Tab, Fade, Grow, Paper, IconButton,
  useTheme, useMediaQuery
} from '@mui/material';
import { motion } from 'framer-motion';
import { db } from './firebase';
import { 
  collection, addDoc, updateDoc, doc,
  query, onSnapshot, Timestamp
} from 'firebase/firestore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BarChartIcon from '@mui/icons-material/BarChart';

// HabitCard Component with animation and completion status
const HabitCard = ({ habit, onComplete }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{habit.name}</Typography>
          <IconButton 
            onClick={() => onComplete(habit.id, !habit.completed_today)}
            color={habit.completed_today ? "success" : "default"}
          >
            {habit.completed_today ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
          </IconButton>
        </Box>
        <Typography color="textSecondary">{habit.description}</Typography>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography>
            Streak: {habit.streak} days
          </Typography>
          <Typography variant="caption" color={habit.completed_today ? "success.main" : "text.secondary"}>
            {habit.completed_today ? 'Completed Today' : 'Not Completed'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  </motion.div>
);

function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [habits, setHabits] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', type: 'success' });
  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState({ totalHabits: 0, totalStreaks: 0, completedToday: 0 });

  // Check Firebase connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const habitsQuery = query(collection(db, 'habits'));
        const unsubscribe = onSnapshot(habitsQuery, 
          () => {
            console.log("Firebase connection successful");
            setError('');
          },
          (error) => {
            console.error("Firebase connection error:", error);
            setError('Unable to connect to Firebase. Please check your internet connection and try again.');
          }
        );
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up Firebase listener:", error);
        setError('Failed to initialize Firebase connection.');
      }
    };

    checkConnection();
  }, []);

  // Real-time habit updates
  useEffect(() => {
    try {
      const habitsQuery = query(collection(db, 'habits'));
      const unsubscribe = onSnapshot(habitsQuery, 
        (snapshot) => {
          const habitsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHabits(habitsData);
          setError(''); // Clear any previous errors

          // Update statistics
          const totalStreaks = habitsData.reduce((sum, habit) => sum + habit.streak, 0);
          const completedToday = habitsData.filter(h => h.completed_today).length;
          setStats({
            totalHabits: habitsData.length,
            totalStreaks,
            completedToday
          });
        },
        (error) => {
          console.error("Error fetching habits:", error);
          setError('Failed to fetch habits. Please try again.');
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up habits listener:", error);
      setError('Failed to set up habits listener. Please try again.');
    }
  }, []);

  // Create new habit
  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      // Validate input
      if (!formData.name.trim()) {
        throw new Error('Habit name cannot be empty');
      }

      // Prepare habit data
      const habitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        streak: 0,
        completed_today: false,
        last_completed: null,
        created_at: Timestamp.now()
      };

      console.log("Attempting to create habit with data:", habitData);

      // Create the habit
      const habitsCollection = collection(db, 'habits');
      console.log("Firestore collection reference created");

      const docRef = await addDoc(habitsCollection, habitData);
      console.log("Habit document created with ID:", docRef.id);
      
      if (!docRef.id) {
        throw new Error('Failed to get document ID after creation');
      }

      // Clear form and show success message
      setFormData({ name: '', description: '' });
      setNotification({
        open: true,
        message: 'Habit created successfully!',
        type: 'success'
      });
    } catch (err) {
      console.error("Error creating habit:", err);
      
      let errorMessage = 'Failed to create habit';
      if (err.code) {
        switch (err.code) {
          case 'permission-denied':
            errorMessage = 'Permission denied. Please check your Firebase rules.';
            break;
          case 'unavailable':
            errorMessage = 'Firebase service is unavailable. Please check your internet connection.';
            break;
          case 'failed-precondition':
            errorMessage = 'Operation failed. Please try again.';
            break;
          default:
            errorMessage = `Error: ${err.code}`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setNotification({
        open: true,
        message: errorMessage,
        type: 'error'
      });
    } finally {
      // Always reset the submitting state
      setIsSubmitting(false);
    }
  };

  // Complete a habit
  const handleComplete = async (habitId, completed) => {
    try {
      const habitRef = doc(db, 'habits', habitId);
      const habit = habits.find(h => h.id === habitId);
      
      const now = Timestamp.now();
      const lastCompleted = habit.last_completed;
      const isNewDay = !lastCompleted || 
        (now.toDate().toDateString() !== lastCompleted.toDate().toDateString());

      await updateDoc(habitRef, {
        completed_today: completed,
        last_completed: completed ? now : null,
        streak: completed && isNewDay ? habit.streak + 1 : 
               (!completed && !isNewDay) ? Math.max(0, habit.streak - 1) : habit.streak
      });

      setNotification({
        open: true,
        message: completed ? 'Habit completed!' : 'Habit marked as incomplete',
        type: 'success'
      });
    } catch (err) {
      setNotification({
        open: true,
        message: 'Failed to update habit',
        type: 'error'
      });
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          padding: isMobile ? '0.5rem 0' : '1rem 0'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar 
            disableGutters
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 2 : 0
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PsychologyIcon sx={{ mr: 1, fontSize: isMobile ? 24 : 32 }} />
              <Typography 
                variant={isMobile ? "h6" : "h5"}
                component="div" 
                sx={{ 
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}
              >
                Habit Tracker
              </Typography>
            </Box>
            
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              textColor="inherit"
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: 'white',
                  height: '3px',
                },
                '& .MuiTab-root': {
                  minWidth: isMobile ? 'auto' : 120,
                  padding: isMobile ? '8px 4px' : '12px 16px',
                  fontSize: isMobile ? '0.7rem' : '0.9rem',
                  fontWeight: 500,
                  '&.Mui-selected': {
                    color: 'white',
                  },
                },
              }}
            >
              <Tab 
                icon={<PsychologyIcon />} 
                label={isMobile ? null : "All Habits"} 
                iconPosition="start"
              />
              <Tab 
                icon={<AddCircleOutlineIcon />} 
                label={isMobile ? null : "Create Habit"} 
                iconPosition="start"
              />
              <Tab 
                icon={<BarChartIcon />} 
                label={isMobile ? null : "Statistics"} 
                iconPosition="start"
              />
            </Tabs>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4, px: isMobile ? 2 : 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {currentTab === 0 && (
          <Fade in={true}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Your Habits
              </Typography>
              {habits.length === 0 ? (
                <Typography color="textSecondary" align="center">
                  {error ? error : 'No habits created yet. Start by creating one!'}
                </Typography>
              ) : (
                habits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={handleComplete}
                  />
                ))
              )}
            </Box>
          </Fade>
        )}

        {currentTab === 1 && (
          <Grow in={true}>
            <Paper elevation={3} sx={{ p: isMobile ? 2 : 3 }}>
              <Typography variant="h5" gutterBottom>
                Create New Habit
              </Typography>
              <Box component="form" onSubmit={handleCreateHabit} noValidate>
                <TextField
                  fullWidth
                  label="Habit Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  margin="normal"
                  required
                  size={isMobile ? "small" : "medium"}
                  disabled={isSubmitting}
                  error={!!error}
                  helperText={error}
                  autoFocus
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  margin="normal"
                  multiline
                  rows={isMobile ? 2 : 4}
                  size={isMobile ? "small" : "medium"}
                  disabled={isSubmitting}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  sx={{ 
                    mt: 2,
                    minWidth: 120,
                    position: 'relative',
                    height: 36
                  }}
                  disabled={isSubmitting}
                  fullWidth={isMobile}
                >
                  {isSubmitting ? (
                    <CircularProgress 
                      size={24} 
                      sx={{ 
                        color: 'inherit',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                      }}
                    />
                  ) : (
                    'Create Habit'
                  )}
                </Button>
              </Box>
            </Paper>
          </Grow>
        )}

        {currentTab === 2 && (
          <Fade in={true}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Statistics
              </Typography>
              <Paper elevation={3} sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Total Habits: {stats.totalHabits}
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Total Streaks: {stats.totalStreaks}
                </Typography>
                <Typography variant="h6">
                  Completed Today: {stats.completedToday}
                </Typography>
              </Paper>
            </Box>
          </Fade>
        )}

        <Snackbar
          open={notification.open}
          autoHideDuration={3000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.type}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default App;