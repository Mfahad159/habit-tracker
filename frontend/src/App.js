import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, Button, 
  Card, CardContent, Alert, CircularProgress, Snackbar,
  AppBar, Toolbar, Tabs, Tab, Fade, Grow, Paper, IconButton,
  useTheme, useMediaQuery, Divider, Link
} from '@mui/material';
import { motion } from 'framer-motion';
import { db } from './firebase';
import { 
  collection, addDoc, updateDoc, doc, deleteDoc,
  query, onSnapshot, Timestamp
} from 'firebase/firestore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import BarChartIcon from '@mui/icons-material/BarChart';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

// HabitCard Component with animation and completion status
const HabitCard = ({ habit, onComplete, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{habit.name}</Typography>
          <Box>
            <IconButton 
              onClick={() => onComplete(habit.id, !habit.completed_today)}
              color={habit.completed_today ? "success" : "default"}
            >
              {habit.completed_today ? <CheckCircleIcon /> : <CheckCircleOutlineIcon />}
            </IconButton>
            <IconButton 
              onClick={() => onDelete(habit.id)}
              color="error"
              size="small"
            >
              <DeleteOutlineIcon />
            </IconButton>
          </Box>
        </Box>
        <Typography color="textSecondary" sx={{ mt: 1, mb: 2 }}>{habit.description}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

  // Delete a habit
  const handleDelete = async (habitId) => {
    try {
      const habitRef = doc(db, 'habits', habitId);
      await deleteDoc(habitRef);
      
      setNotification({
        open: true,
        message: 'Habit deleted successfully',
        type: 'success'
      });
    } catch (err) {
      console.error("Error deleting habit:", err);
      setNotification({
        open: true,
        message: 'Failed to delete habit',
        type: 'error'
      });
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{ 
        background: 'transparent',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Container maxWidth="lg">
          <Toolbar sx={{ 
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 0,
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PsychologyIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h5" component="div" sx={{ 
                fontWeight: 600,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Smart Habit Tracker
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                textColor="primary"
                sx={{
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'primary.main',
                    height: '3px',
                  },
                  '& .MuiTab-root': {
                    minWidth: isMobile ? 'auto' : 120,
                    padding: isMobile ? '8px 12px' : '12px 16px',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    fontWeight: 500,
                    color: 'text.primary',
                    '&.Mui-selected': {
                      color: 'primary.main',
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
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                ml: 2,
                '& .MuiIconButton-root': {
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    color: 'primary.main'
                  }
                }
              }}>
                <IconButton 
                  color="primary" 
                  href="https://github.com/Mfahad159/habit-tracker" 
                  target="_blank"
                  aria-label="GitHub Repository"
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.1)'
                    }
                  }}
                >
                  <GitHubIcon />
                </IconButton>
                <IconButton 
                  color="primary" 
                  href="https://www.linkedin.com/in/muhammad-fahad-136436291?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" 
                  target="_blank"
                  aria-label="LinkedIn Profile"
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.1)'
                    }
                  }}
                >
                  <LinkedInIcon />
                </IconButton>
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ 
        flex: 1,
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* All Habits Section */}
        {currentTab === 0 && (
          <Fade in={true}>
            <Paper elevation={3} sx={{ 
              p: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h4" gutterBottom sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 3
              }}>
                Your Habits
              </Typography>
              {habits.length === 0 ? (
                <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
                  No habits created yet. Start by creating one!
                </Typography>
              ) : (
                habits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </Paper>
          </Fade>
        )}

        {/* Create Habit Section */}
        {currentTab === 1 && (
          <Grow in={true}>
            <Paper elevation={3} sx={{ 
              p: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h4" gutterBottom sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 3
              }}>
                Create New Habit
              </Typography>
              <Box component="form" onSubmit={handleCreateHabit} noValidate sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Habit Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  margin="normal"
                  required
                  size="medium"
                  disabled={isSubmitting}
                  error={!!error}
                  helperText={error}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                  }}
                />
                <TextField
                  fullWidth
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  margin="normal"
                  multiline
                  minRows={3}
                  maxRows={5}
                  placeholder="Enter a description for your habit..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: 'rgba(0, 0, 0, 0.23)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'primary.main',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'primary.main',
                      },
                    },
                    '& .MuiInputBase-input': {
                      padding: '14px',
                    },
                  }}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  sx={{ 
                    mt: 3,
                    minWidth: 200,
                    height: 48,
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                    }
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Create Habit'
                  )}
                </Button>
              </Box>
            </Paper>
          </Grow>
        )}

        {/* Statistics Section */}
        {currentTab === 2 && (
          <Fade in={true}>
            <Paper elevation={3} sx={{ 
              p: 4,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }}>
              <Typography variant="h4" gutterBottom sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 3
              }}>
                Statistics
              </Typography>
              <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', background: 'rgba(33, 150, 243, 0.1)' }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Total Habits
                  </Typography>
                  <Typography variant="h3" color="text.primary">
                    {stats.totalHabits}
                  </Typography>
                </Paper>
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', background: 'rgba(76, 175, 80, 0.1)' }}>
                  <Typography variant="h6" color="success.main" gutterBottom>
                    Total Streaks
                  </Typography>
                  <Typography variant="h3" color="text.primary">
                    {stats.totalStreaks}
                  </Typography>
                </Paper>
                <Paper elevation={2} sx={{ p: 3, textAlign: 'center', background: 'rgba(156, 39, 176, 0.1)' }}>
                  <Typography variant="h6" color="secondary.main" gutterBottom>
                    Completed Today
                  </Typography>
                  <Typography variant="h3" color="text.primary">
                    {stats.completedToday}
                  </Typography>
                </Paper>
              </Box>
            </Paper>
          </Fade>
        )}
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ 
        py: 3,
        mt: 'auto',
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Smart Habit Tracker. All rights reserved.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" color="inherit" underline="hover">
                Privacy Policy
              </Link>
              <Link href="#" color="inherit" underline="hover">
                Terms of Service
              </Link>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Notification Snackbar */}
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
    </Box>
  );
}

export default App;