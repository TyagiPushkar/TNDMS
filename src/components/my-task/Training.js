"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import Swal from "sweetalert2"
import {
  Grid,
  Box,
  Button,
  TextField,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Paper,
  InputAdornment,
  Container,
  CircularProgress,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from "@mui/material"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import CancelIcon from "@mui/icons-material/Cancel"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import QuizIcon from "@mui/icons-material/Quiz"

export default function Training() {
  const navigate = useNavigate()
  const params = useParams()
  const location = useLocation();
  
  const { menuId } = params
  const searchParams = new URLSearchParams(location.search)
  const ticketId = location.state?.ticketId;
  const [pages, setPages] = useState([])
  const [checkpoints, setCheckpoints] = useState([])
  const [types, setTypes] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [visibleDependents, setVisibleDependents] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [examTime, setExamTime] = useState(0)
  const [passPercentage, setPassPercentage] = useState(0.7) // Default to 70%

  // Timer effect
  useEffect(() => {
    if (!submitted) {
      const timer = setInterval(() => {
        setExamTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [submitted])

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Amount fields configuration
  const amountFieldIds = [62, 64, 66, 70]
  const totalFieldId = 72

  // Format currency helper
  const formatCurrency = (value) => {
    const num = Number.parseFloat(value) || 0
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  // Calculate total bid value whenever any amount field changes
  useEffect(() => {
    const field61 = Number.parseFloat(formData[61]) || 0
    const field62 = Number.parseFloat(formData[62]) || 0
    const field63 = Number.parseFloat(formData[63]) || 0
    const field64 = Number.parseFloat(formData[64]) || 0
    const field65 = Number.parseFloat(formData[65]) || 0
    const field66 = Number.parseFloat(formData[66]) || 0
    const field69 = Number.parseFloat(formData[69]) || 0
    const field70 = Number.parseFloat(formData[70]) || 0
    const total = field61 * field62 + field63 * field64 + field65 * field66 + field69 * field70
    if (formData[totalFieldId] !== total.toString()) {
      handleChange(totalFieldId, total.toFixed(2))
    }
  }, [formData[61], formData[62], formData[63], formData[64], formData[65], formData[66], formData[69], formData[70]])

  const handleChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
    setErrors((prev) => ({ ...prev, [id]: false }))
    updateDependentFields(id, value)
  }

  const updateDependentFields = (parentId, value) => {
    const parentCheckpoint = checkpoints.find((cp) => cp.CheckpointId === parentId)
    if (!parentCheckpoint || !parentCheckpoint.Dependent || parentCheckpoint.Dependent.trim() === "") return

    if (parentCheckpoint.Dependent.trim() === "6") {
      const newVisibleDependents = { ...visibleDependents }
      newVisibleDependents[parentId] = [6]
      setVisibleDependents(newVisibleDependents)
      return
    }

    if ([5, 6, 9].includes(parentCheckpoint.TypeId)) {
      const options = parentCheckpoint.Options ? parentCheckpoint.Options.split(",").map((opt) => opt.trim()) : []
      const dependentMapping = parentCheckpoint.Dependent.split(":").map((dep) => dep.trim())
      const newVisibleDependents = { ...visibleDependents }

      if (parentCheckpoint.TypeId === 5 || (parentCheckpoint.TypeId === 9 && parentCheckpoint.Correct !== "1")) {
        const selectedIndex = options.findIndex((opt) => opt.trim() === value)
        if (selectedIndex !== -1 && selectedIndex < dependentMapping.length) {
          const dependentIds = dependentMapping[selectedIndex]
            .split(",")
            .filter((id) => id !== "0")
            .map((id) => Number.parseInt(id))
          newVisibleDependents[parentId] = dependentIds
        } else {
          newVisibleDependents[parentId] = []
        }
      } else if (parentCheckpoint.TypeId === 6 || (parentCheckpoint.TypeId === 9 && parentCheckpoint.Correct === "1")) {
        const selectedValues = Array.isArray(value) ? value : value ? value.split(",").map((v) => v.trim()) : []
        const dependentIds = []
        selectedValues.forEach((val) => {
          const optionIndex = options.findIndex((opt) => opt.trim() === val)
          if (optionIndex !== -1 && optionIndex < dependentMapping.length) {
            const ids = dependentMapping[optionIndex]
              .split(",")
              .filter((id) => id !== "0")
              .map((id) => Number.parseInt(id))
            dependentIds.push(...ids)
          }
        })
        newVisibleDependents[parentId] = dependentIds
      }
      setVisibleDependents(newVisibleDependents)
    }
  }

  const isVisibleDependent = (checkpointId) => {
    for (const parentId in visibleDependents) {
      if (visibleDependents[parentId].includes(checkpointId)) {
        return true
      }
    }
    return false
  }

  const getParentId = (checkpointId) => {
    for (const parentId in visibleDependents) {
      if (visibleDependents[parentId].includes(checkpointId)) {
        return Number.parseInt(parentId)
      }
    }
    return null
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Use environment variables for API URLs in a real application
        const menuRes = await axios.get(`https://namami-infotech.com/TNDMS/src/menu/get_menu.php?MenuId=${menuId}`)
        const checkpointRes = await axios.get("https://namami-infotech.com/TNDMS/src/menu/get_checkpoints.php")
        const typeRes = await axios.get("https://namami-infotech.com/TNDMS/src/menu/get_types.php")

        const checkpointIds = menuRes.data.data[0].CheckpointId.split(";").map((p) =>
          p.split(",").map((id) => Number.parseInt(id)),
        )
        setPages(checkpointIds)
        setCheckpoints(checkpointRes.data.data)
        setTypes(typeRes.data.data)

        // Calculate total questions based on the current menu's checkpoints
        const relevantCheckpointIds = checkpointIds.flat() // Flatten all pages into a single list of IDs
        const relevantCheckpoints = checkpointRes.data.data.filter((cp) =>
          relevantCheckpointIds.includes(cp.CheckpointId),
        )
        const total = relevantCheckpoints.filter((cp) => {
          const type = typeRes.data.data.find((t) => t.TypeId === cp.TypeId)?.Type?.toLowerCase() || ""
          return !type.includes("header") && !type.includes("description")
        }).length
        setTotalQuestions(total)

        // Set pass percentage from menu API (using 'Paas' as per your JSON)
        const passPercent = Number.parseFloat(menuRes.data.data[0].Paas) / 100 || 0.7 // Convert to decimal, default to 0.7
        setPassPercentage(passPercent)
      } catch (error) {
        console.error("Error fetching data:", error)
        setLoadingError("Failed to load form data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [menuId]) // Depend on menuId to refetch if it changes

  useEffect(() => {
    Object.entries(formData).forEach(([id, value]) => {
      updateDependentFields(Number.parseInt(id), value)
    })
  }, [checkpoints])

  const getType = (typeId) => {
    const type = types.find((t) => t.TypeId === typeId)
    return type ? type.Type.trim() : "Unknown"
  }

  const isCorrectAnswer = (checkpointId, userAnswer) => {
    const cp = checkpoints.find((c) => c.CheckpointId === checkpointId)
    if (!cp || !cp.Correct) return false
    const correctAnswer = cp.Correct.trim()
    if (!correctAnswer) return false

    const type = getType(cp.TypeId).toLowerCase()

    if (type === "checkbox" || (type === "dropdown" && cp.Correct === "1")) {
      // For multi-select questions
      const correctAnswers = correctAnswer.split(",").map((a) => a.trim())
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : userAnswer ? userAnswer.split(",") : []

      if (correctAnswers.length !== userAnswers.length) return false
      return (
        correctAnswers.every((ans) => userAnswers.includes(ans)) &&
        userAnswers.every((ans) => correctAnswers.includes(ans))
      )
    } else {
      // For single answer questions
      return userAnswer === correctAnswer
    }
  }

  const renderField = (cp, showCorrectAnswer = false) => {
    const type = getType(cp.TypeId).trim()
    const options = cp.Options ? cp.Options.split(",").map((opt) => opt.trim()) : []
    const value = formData[cp.CheckpointId] || ""
    const error = errors[cp.CheckpointId]
    const editable = cp.Editable === 1 && !submitted
    const isMandatory = cp.Mandatory === 1
    const isCorrect = showCorrectAnswer && isCorrectAnswer(cp.CheckpointId, value)
    const hasAnswer = value !== "" && value !== null && value !== undefined

    if (cp.CheckpointId === totalFieldId) {
      return (
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <Typography sx={{ fontWeight: 500, color: "#555" }}>
              {cp.Description}
              {isMandatory && <span style={{ color: "red", marginLeft: "4px" }}>*</span>}
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              value={formatCurrency(value || "0")}
              InputProps={{
                readOnly: true,
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#f5f5f5",
                  "& input": {
                    fontWeight: "bold",
                    color: "#2e7d32",
                  },
                },
              }}
            />
          </Grid>
        </Grid>
      )
    }

    if (amountFieldIds.includes(cp.CheckpointId)) {
      return (
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={4}>
            <Typography sx={{ fontWeight: 500, color: "#555" }}>
              {cp.Description}
              {isMandatory && <span style={{ color: "red", marginLeft: "4px" }}>*</span>}
              {showCorrectAnswer &&
                hasAnswer &&
                (isCorrect ? (
                  <CheckCircleIcon sx={{ color: "green", ml: 1, fontSize: "1rem" }} />
                ) : (
                  <CancelIcon sx={{ color: "red", ml: 1, fontSize: "1rem" }} />
                ))}
            </Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              fullWidth
              type="number"
              value={value}
              onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}
              error={error}
              helperText={error ? "This field is required" : ""}
              disabled={!editable}
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              inputProps={{
                step: "0.01",
                min: "0",
              }}
              sx={{
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#F69320",
                },
              }}
              onBlur={(e) => {
                const num = Number.parseFloat(e.target.value) || 0
                handleChange(cp.CheckpointId, num.toFixed(2))
              }}
            />
            {showCorrectAnswer && cp.Correct && (
              <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                Correct answer: {cp.Correct}
              </Typography>
            )}
          </Grid>
        </Grid>
      )
    }

    if (type.toLowerCase().includes("header")) {
      return (
        <Typography variant="h6" sx={{ mt: 3, mb: 1, textAlign: "center", color: "#F69320", fontWeight: "bold" }}>
          {cp.Description}
        </Typography>
      )
    }

    if (type.toLowerCase().includes("description")) {
      return (
        <Typography sx={{ mb: 2, fontStyle: "italic", color: "#666", textAlign: "center" }}>
          {cp.Description}
        </Typography>
      )
    }

    // Determine if the current type should use the MCQ-like vertical layout
    const isMcqType = ["dropdown", "radio", "checkbox"].includes(type.toLowerCase())

    return (
      <Grid container spacing={2} {...(isMcqType ? {} : { alignItems: "center" })}>
        <Grid item xs={12} sm={isMcqType ? 12 : 4}>
          {" "}
          {/* Full width for MCQ types, 4 for others */}
          <Typography sx={{ fontWeight: 500, color: "#555" }}>
            {cp.Description}
            {isMandatory && <span style={{ color: "red", marginLeft: "4px" }}>*</span>}
            {showCorrectAnswer &&
              hasAnswer &&
              (isCorrect ? (
                <CheckCircleIcon sx={{ color: "green", ml: 1, fontSize: "1rem" }} />
              ) : (
                <CancelIcon sx={{ color: "red", ml: 1, fontSize: "1rem" }} />
              ))}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={isMcqType ? 12 : 8}>
          {" "}
          {/* Full width for MCQ types, 8 for others */}
          {(() => {
            switch (type) {
              case "Text":
              case "Email":
                return (
                  <>
                    <TextField
                      fullWidth
                      type={type === "Email" ? "email" : "text"}
                      value={value}
                      onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}
                      error={error}
                      helperText={error ? "This field is required" : ""}
                      disabled={!editable}
                      size="small"
                      sx={{
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#F69320",
                        },
                      }}
                    />
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct}
                      </Typography>
                    )}
                  </>
                )
              case "Number":
              case "Digit":
                return (
                  <>
                    <TextField
                      fullWidth
                      type="number"
                      value={value}
                      onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}
                      error={error}
                      helperText={error ? "This field is required" : ""}
                      disabled={!editable}
                      size="small"
                      sx={{
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#F69320",
                        },
                      }}
                    />
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct}
                      </Typography>
                    )}
                  </>
                )
              case "Long Text":
                return (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      value={value}
                      onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}
                      error={error}
                      helperText={error ? "This field is required" : ""}
                      disabled={!editable}
                      size="small"
                      sx={{
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#F69320",
                        },
                      }}
                    />
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct}
                      </Typography>
                    )}
                  </>
                )
              case "Date":
                return (
                  <>
                    <TextField
                      fullWidth
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      value={value}
                      onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}
                      error={error}
                      helperText={error ? "This field is required" : ""}
                      disabled={!editable}
                      size="small"
                      sx={{
                        "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                          borderColor: "#F69320",
                        },
                      }}
                    />
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct}
                      </Typography>
                    )}
                  </>
                )
              case "Dropdown":
                const isMultiSelect = cp.Correct === "1"
                return (
                  <>
                    <Autocomplete
                      fullWidth
                      multiple={isMultiSelect}
                      options={options}
                      value={
                        isMultiSelect ? (value ? (Array.isArray(value) ? value : value.split(",")) : []) : value || null
                      }
                      onChange={(event, newValue) => {
                        const finalValue = isMultiSelect ? newValue.join(",") : newValue
                        handleChange(cp.CheckpointId, finalValue)
                      }}
                      disabled={!editable}
                      size="small"
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label=""
                          error={error}
                          helperText={error ? "This field is required" : ""}
                          sx={{
                            "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#F69320",
                            },
                          }}
                        />
                      )}
                    />
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct.split(",").join(", ")}
                      </Typography>
                    )}
                  </>
                )
              case "Radio":
                return (
                  <>
                    <RadioGroup row value={value} onChange={(e) => handleChange(cp.CheckpointId, e.target.value)}>
                      {options.map((opt) => (
                        <FormControlLabel
                          key={opt}
                          value={opt}
                          control={
                            <Radio
                              disabled={!editable}
                              sx={{
                                "&.Mui-checked": {
                                  color: isCorrect && showCorrectAnswer ? "green" : "#F69320",
                                },
                              }}
                            />
                          }
                          label={opt}
                        />
                      ))}
                    </RadioGroup>
                    {error && (
                      <Typography color="error" variant="body2">
                        This field is required
                      </Typography>
                    )}
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct}
                      </Typography>
                    )}
                  </>
                )
              case "Checkbox":
                return (
                  <>
                    <FormGroup row>
                      {options.map((opt) => (
                        <FormControlLabel
                          key={opt}
                          control={
                            <Checkbox
                              checked={value?.includes(opt)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                let updated = []
                                if (typeof value === "string") {
                                  updated = value ? value.split(",").map((v) => v.trim()) : []
                                } else if (Array.isArray(value)) {
                                  updated = [...value]
                                }
                                if (checked && !updated.includes(opt)) {
                                  updated.push(opt)
                                } else if (!checked) {
                                  updated = updated.filter((v) => v !== opt)
                                }
                                handleChange(cp.CheckpointId, updated)
                              }}
                              disabled={!editable}
                              sx={{
                                "&.Mui-checked": {
                                  color: isCorrect && showCorrectAnswer && value?.includes(opt) ? "green" : "#F69320",
                                },
                              }}
                            />
                          }
                          label={opt}
                        />
                      ))}
                    </FormGroup>
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct answer: {cp.Correct.split(",").join(", ")}
                      </Typography>
                    )}
                  </>
                )
              case "Pic/Camera":
                return (
                  <Box>
                    <Button
                      variant="outlined"
                      component="label"
                      sx={{
                        borderColor: error ? "#d32f2f" : "#ddd",
                        color: error ? "#d32f2f" : "#666",
                        "&:hover": {
                          borderColor: "#F69320",
                          backgroundColor: "rgba(246, 147, 32, 0.04)",
                        },
                      }}
                      disabled={!editable}
                    >
                      {value ? "Change File" : "Upload File"}
                      <input
                        type="file"
                        hidden
                        accept="image/png, image/jpeg, application/pdf"
                        onChange={(e) => handleChange(cp.CheckpointId, e.target.files[0])}
                      />
                    </Button>
                    {value && (
                      <Typography variant="body2" sx={{ mt: 1, color: "#666" }}>
                        Selected: {value.name}
                      </Typography>
                    )}
                    {error && (
                      <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                        This field is required
                      </Typography>
                    )}
                    {showCorrectAnswer && cp.Correct && (
                      <Typography variant="body2" sx={{ mt: 1, color: isCorrect ? "green" : "red" }}>
                        Correct file name should contain: {cp.Correct}
                      </Typography>
                    )}
                  </Box>
                )
              default:
                return <TextField size="small" disabled />
            }
          })()}
        </Grid>
      </Grid>
    )
  }

  const renderCheckpointWithDependents = (cp, pageData, showCorrectAnswer = false) => {
    const isEven = pageData.indexOf(cp.CheckpointId) % 2 === 0
    const bgColor = isEven ? "#f8f8f8" : "#ffffff"
    const dependentIds = visibleDependents[cp.CheckpointId] || []
    const dependentCheckpoints = checkpoints.filter((c) => dependentIds.includes(c.CheckpointId))

    return (
      <Paper
        key={cp.CheckpointId}
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 1,
          maxWidth: "85%",
          mx: "auto",
          mb: 2,
          backgroundColor: bgColor,
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          "&:hover": {
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box sx={{ flexGrow: 1 }}>{renderField(cp, showCorrectAnswer)}</Box>
        </Box>
        {dependentCheckpoints.length > 0 && (
          <Box
            sx={{
              pl: 4,
              mt: 2,
              borderLeft: "2px solid #F69320",
            }}
          >
            {dependentCheckpoints.map((depCp) => (
              <Box key={depCp.CheckpointId} sx={{ mb: 1 }}>
                {renderField(depCp, showCorrectAnswer)}
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    )
  }

  const calculateScore = () => {
    let correct = 0
    let total = 0
    // Only count questions that are part of the current menu's pages
    const relevantCheckpointIds = pages.flat()
    const relevantCheckpoints = checkpoints.filter((cp) => relevantCheckpointIds.includes(cp.CheckpointId))

    relevantCheckpoints.forEach((cp) => {
      const type = getType(cp.TypeId).toLowerCase()
      if (type.includes("header") || type.includes("description")) return
      total++
      if (cp.Correct && isCorrectAnswer(cp.CheckpointId, formData[cp.CheckpointId])) {
        correct++
      }
    })
    setScore(correct)
    setTotalQuestions(total)
    return { correct, total }
  }

  const handleSubmit = async () => {
    const newErrors = {}
    let hasErrors = false

    // First pass: Validate mandatory fields
    pages.forEach((pageCheckpoints) => {
      pageCheckpoints.forEach((id) => {
        const cp = checkpoints.find((c) => c.CheckpointId === id)
        if (!cp) return
        const type = getType(cp.TypeId).toLowerCase()
        if (type.includes("header") || type.includes("description")) return

        // Only check mandatory fields
        if (cp.Mandatory === 1) {
          const value = formData[id]
          if (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0)
          ) {
            newErrors[id] = true
            hasErrors = true
          }
        }
      })
    })

    if (hasErrors) {
      setErrors(newErrors)
      Swal.fire({
        icon: "error",
        title: "Missing Required Fields",
        text: "Please fill all mandatory fields before submitting.",
      })
      return
    }

    setErrors({})
    setSubmitted(true)
    const { correct, total } = calculateScore()

    Swal.fire({
      title: "Submitting form...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latLong = `${pos.coords.latitude}, ${pos.coords.longitude}`
        const date = new Date()
        const dateTime = date.toISOString().slice(0, 19).replace("T", " ")
        const activityId = `${dateTime.replace(/\D/g, "")}_${latLong.replace(/[^0-9]/g, "")}`

        try {
          // Prepare text data - include ALL fields, with null for unfilled ones
          const textData = {}
          const imageData = {}

          // Process all checkpoints that are in the form pages
          for (const page of pages) {
            for (const id of page) {
              const cp = checkpoints.find((c) => c.CheckpointId === id)
              if (!cp) continue
              const type = getType(cp.TypeId).toLowerCase()

              // Skip headers and descriptions
              if (type.includes("header") || type.includes("description")) continue

              const value = formData[id]
              const parentId = getParentId(id)

              // Handle dependent fields
              if (parentId) {
                const combinedId = `${parentId}_${id}`
                if (type === "pic/camera") {
                  if (value) {
                    const base64 = await convertToBase64(value)
                    imageData[combinedId] = base64
                  } else {
                    imageData[combinedId] = null
                  }
                } else {
                  textData[combinedId] = value ? (Array.isArray(value) ? value.join(",") : value) : null
                }
                continue
              }

              // Handle regular fields
              if (type === "pic/camera") {
                if (value) {
                  const base64 = await convertToBase64(value)
                  imageData[id] = base64
                } else {
                  imageData[id] = null
                }
              } else {
                textData[id] = value ? (Array.isArray(value) ? value.join(",") : value) : null
              }
            }
          }

          // Submit text data (now includes all fields)
          await axios.post("https://namami-infotech.com/TNDMS/src/menu/add_transaction.php", {
            menuId,
            ActivityId: activityId,
            LatLong: latLong,
            data: textData,
            TaskId: ticketId || null,
          })

          // Submit image data (now includes all fields)
          if (Object.keys(imageData).length > 0) {
            await axios.post("https://namami-infotech.com/TNDMS/src/menu/add_image.php", {
              menuId,
              ActivityId: activityId,
              LatLong: latLong,
              data: imageData,
            })
          }

          Swal.fire({
            icon: "success",
            title: "Form Submitted",
            html: `
              <div>
                <p>Your form has been submitted successfully!</p>
                <p>Score: ${correct}/${total} (${Math.round((correct / total) * 100)}%)</p>
                <p>Time taken: ${formatTime(examTime)}</p>
              </div>
            `,
            confirmButtonColor: "#F69320",
          }).then(() => {
            setShowResults(true)
          })
        } catch (error) {
          console.error("Submission error", error)
          Swal.fire({
            icon: "error",
            title: "Submission Failed",
            text: "There was an error processing your request. Please try again.",
            confirmButtonColor: "#F69320",
          })
        }
      },
      (error) => {
        Swal.fire({
          icon: "error",
          title: "Location Access Denied",
          text: "Please allow location access to submit the form.",
          confirmButtonColor: "#F69320",
        })
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const handleNext = () => {
    setCurrentPage((prev) => prev + 1)
  }

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh" flexDirection="column">
        <CircularProgress sx={{ color: "#F69320" }} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading form...
        </Typography>
      </Box>
    )
  }

  if (loadingError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <Box sx={{ maxWidth: 500, textAlign: "center", p: 3, bgcolor: "#ffebee", borderRadius: 1 }}>
          <Typography color="error" variant="h6">
            {loadingError}
          </Typography>
          <Button
            sx={{ mt: 2, color: "#F69320", borderColor: "#F69320" }}
            onClick={() => window.location.reload()}
            variant="outlined"
          >
            Retry
          </Button>
        </Box>
      </Box>
    )
  }

  if (showResults) {
    const userScorePercentage = totalQuestions > 0 ? score / totalQuestions : 0
    const passed = userScorePercentage >= passPercentage

    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h4" component="div" sx={{ mb: 2, textAlign: "center", color: "#F69320" }}>
              Examination Results
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">
                  Score:{" "}
                  <span style={{ color: passed ? "green" : "red" }}>
                    {score}/{totalQuestions} ({Math.round(userScorePercentage * 100)}%)
                  </span>
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6">Time Taken: {formatTime(examTime)}</Typography>
              </Grid>
            </Grid>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {passed
                ? "Congratulations! You have passed the examination."
                : "You did not pass this time. Please review the material and try again."}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#F69320",
                  "&:hover": { backgroundColor: "#e08416" },
                }}
                onClick={() => navigate("/my-tasks")}
              >
                Back to My Tasks
              </Button>
            </Box>
          </CardContent>
        </Card>
        <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
          Question Review
        </Typography>
        {Array.isArray(pages) &&
          pages.map((page, pageIndex) => (
            <Accordion key={pageIndex} id={`accordion-section-${pageIndex}`} defaultExpanded={!passed}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Section {pageIndex + 1}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {Array.isArray(page) &&
                  page.map((id) => {
                    const cp = checkpoints.find((c) => c.CheckpointId === id)
                    if (!cp) return null
                    const type = getType(cp.TypeId).toLowerCase()
                    if (type.includes("header") || type.includes("description")) {
                      return renderField(cp, true)
                    }
                    if (isVisibleDependent(cp.CheckpointId)) {
                      return null
                    }
                    return renderCheckpointWithDependents(cp, page, true)
                  })}
              </AccordionDetails>
            </Accordion>
          ))}
      </Container>
    )
  }

  const pageData = pages[currentPage] || []

  return (
    <Container maxWidth="l" sx={{ mt: 0, mb: 4 }}>
      {!submitted && (
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1000,
            py: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ textAlign: "center", color: "#F69320" }}>
            Examination in Progress
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            <Typography variant="body2">
              Page {currentPage + 1} of {pages.length}
            </Typography>
            <Chip
              icon={<AccessTimeIcon />}
              label={`Time: ${formatTime(examTime)}`}
              color="primary"
              sx={{
                backgroundColor: "#F69320",
                color: "white",
                "& .MuiChip-icon": { color: "white" },
              }}
            />
            <Typography variant="body2">
              <QuizIcon sx={{ fontSize: "1rem", mr: 0.5, verticalAlign: "middle" }} />
              Questions: {totalQuestions}
            </Typography>
          </Box>
          {/* Progress bar */}
          <LinearProgress
            variant="determinate"
            value={((currentPage + 1) / pages.length) * 100}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 3,
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#F69320",
              },
            }}
          />
        </Box>
      )}
      <Box sx={{ minHeight: "60vh" }}>
        {pageData.map((id) => {
          const cp = checkpoints.find((c) => c.CheckpointId === id)
          if (!cp) return null
          const type = getType(cp.TypeId).toLowerCase()
          if (type.includes("header") || type.includes("description")) {
            return renderField(cp)
          }
          if (isVisibleDependent(cp.CheckpointId)) {
            return null
          }
          return renderCheckpointWithDependents(cp, pageData)
        })}
      </Box>
      {!submitted && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mt: 4,
            position: "sticky",
            bottom: 0,
            py: 2,
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentPage === 0}
            sx={{
              borderColor: "#F69320",
              color: "#F69320",
              "&:hover": {
                borderColor: "#e08416",
                backgroundColor: "rgba(246, 147, 32, 0.04)",
              },
            }}
          >
            Previous
          </Button>
          {currentPage === pages.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                backgroundColor: "#F69320",
                "&:hover": {
                  backgroundColor: "#e08416",
                },
              }}
            >
              Submit Examination
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                backgroundColor: "#F69320",
                "&:hover": {
                  backgroundColor: "#e08416",
                },
              }}
            >
              Next
            </Button>
          )}
        </Box>
      )}
    </Container>
  )
}
