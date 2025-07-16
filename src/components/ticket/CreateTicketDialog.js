"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Autocomplete,
} from "@mui/material"
import { LoadingButton } from "@mui/lab"

const CreateTicketDialog = ({ open, onClose, onTicketCreated }) => {
  const [formData, setFormData] = useState({
    empId: "",
    MenuId: "",
    remark: ""
  })
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

  const menuOptions = [
    { label: "Induction", value: "1" },
    { label: "POSH", value: "2" },
    { label: "ISMS", value: "3" }
  ]

  useEffect(() => {
    if (open) {
      fetchData()
      resetForm()
    }
  }, [open])

  const fetchData = async () => {
    try {
      setDataLoading(true)
      
      // Fetch technicians
      const techResponse = await fetch("https://namami-infotech.com/TNDMS/src/employee/list_employee.php?Tenent_Id=1")
      const techData = await techResponse.json()

      if (techData.success) {
        setTechnicians(techData.data.filter(emp => emp.Role === "Employee"))
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setSnackbar({
        open: true,
        message: "Failed to load technicians",
        severity: "error",
      })
    } finally {
      setDataLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      empId: "",
      MenuId: "",
      remark: ""
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.empId) newErrors.empId = "Technician is required"
    if (!formData.MenuId) newErrors.MenuId = "Menu is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      const selectedTechnician = technicians.find(tech => tech.EmpId === formData.empId)
      const selectedMenu = menuOptions.find(menu => menu.value === formData.MenuId)

      const formDataToSend = new FormData()
      formDataToSend.append("Milestone", selectedMenu?.label || "Support Ticket")
      formDataToSend.append("MenuId", formData.MenuId)
      formDataToSend.append("EmpName", selectedTechnician?.Name || "")
      formDataToSend.append("EmpId", formData.empId)
      formDataToSend.append("Status", "Assigned")
      formDataToSend.append("Remark", formData.remark || "")

      const response = await fetch("https://namami-infotech.com/TNDMS/src/support/create_ticket.php", {
        method: "POST",
        body: formDataToSend,
      })

      const result = await response.json()

      if (result.success) {
        setSnackbar({
          open: true,
          message: "Ticket created successfully",
          severity: "success",
        })
        onTicketCreated()
        onClose()
      } else {
        throw new Error(result.message || "Failed to create ticket")
      }
    } catch (error) {
      console.error("Error:", error)
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6">Assign Training Tasks</Typography>
          <Typography variant="body2" color="text.secondary">
            Assign a task to employee for training
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          {dataLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <Autocomplete
                options={technicians}
                getOptionLabel={(option) => `${option.Name} (${option.EmpId})`}
                value={technicians.find(t => t.EmpId === formData.empId) || null}
                onChange={(e, newValue) => {
                  setFormData(prev => ({ ...prev, empId: newValue?.EmpId || "" }))
                  if (errors.empId) setErrors(prev => ({ ...prev, empId: "" }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Technician"
                    error={!!errors.empId}
                    helperText={errors.empId}
                    required
                  />
                )}
              />

              <Autocomplete
                options={menuOptions}
                getOptionLabel={(option) => option.label}
                value={menuOptions.find(m => m.value === formData.MenuId) || null}
                onChange={(e, newValue) => {
                  setFormData(prev => ({ ...prev, MenuId: newValue?.value || "" }))
                  if (errors.MenuId) setErrors(prev => ({ ...prev, MenuId: "" }))
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Menu"
                    error={!!errors.MenuId}
                    helperText={errors.MenuId}
                    required
                  />
                )}
              />

              <TextField
                label="Remarks"
                value={formData.remark}
                onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <LoadingButton 
            onClick={handleSubmit} 
            loading={loading} 
            variant="contained"
            disabled={dataLoading}
          >
            Assign Task
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

export default CreateTicketDialog