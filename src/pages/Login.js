"use client";

import React, { useState } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  Container,
  IconButton,
  Paper,
  CssBaseline,
  Avatar,
  InputAdornment,
  Link
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../components/auth/AuthContext";
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const API_URL = "https://namami-infotech.com/TNDMS/src/auth";

export default function LoginPage() {
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/login.php`, {
        EmpId: empId,
        password: password,
      });

      if (response.data.success) {
        login(response.data.data);
        setTimeout(() => {
          navigate("/profile");
        }, 1000);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setForgotPasswordError("");
    setForgotPasswordSuccess("");

    try {
      const response = await axios.post(`${API_URL}/forget_password.php`, {
        email: forgotEmail,
      });

      if (response.data.success) {
        setForgotPasswordSuccess("An email with a new password has been sent.");
        setOpenDialog(false);
      } else {
        setForgotPasswordError(response.data.message || "Error sending email");
      }
    } catch (error) {
      setForgotPasswordError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
          TNDMS LOGIN
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, width: '100%', borderRadius: 2 }}>
          {error && (
            <Typography color="error" align="center" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          
          <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="empId"
              label="Username"
              name="empId"
              autoComplete="username"
              autoFocus
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              variant="outlined"
              size="small"
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <Box display="flex" justifyContent="flex-end">
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => setOpenDialog(true)}
                sx={{ color: 'text.secondary' }}
              >
                Forgot password?
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email address and we'll send you instructions to reset your password.
          </Typography>
          {forgotPasswordError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {forgotPasswordError}
            </Typography>
          )}
          {forgotPasswordSuccess && (
            <Typography color="success" variant="body2" sx={{ mb: 2 }}>
              {forgotPasswordSuccess}
            </Typography>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="forgotEmail"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            size="small"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleForgotPassword} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Instructions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}