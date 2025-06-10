"use client"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/nm/button"
import { Input } from "@/components/nm/input"
import { Textarea } from "@/components/nm/textarea"
import { Card, CardContent } from "@/components/nm/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/nm/tabs"
import { Badge } from "@/components/nm/badge"
import { Switch } from "@/components/nm/switch"
import { Label } from "@/components/nm/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/nm/tooltip"
import { VoiceAssistant } from "@/components/nm/voice-assistant"
import {
    ChevronLeft,
    ChevronRight,
    Mic,
    MicOff,
    Volume2,
    HelpCircle,
    Send,
    Upload,
    Shield,
    CheckCircle2,
    Info,
    FileText,
    Lightbulb,
    Accessibility,
} from "lucide-react"

type Field = {
    name: string
    label: string
    instructions: string
    type?: string
    icon?: React.ReactNode
    required?: boolean
}

export default function Threats() {
    // Define the legal form fields
    const fields: Field[] = [
        {
            name: "fullName",
            label: "Full Legal Name",
            instructions: "Enter your complete legal name as it appears on official records.",
            icon: <CheckCircle2 className="text-gray-700" />,
            required: true,
        },
        {
            name: "address",
            label: "Residential Address",
            instructions: "Provide your full residential address including street, city, state, and postal code.",
            type: "textarea",
            icon: <Info className="text-gray-700" />,
            required: true,
        },
        {
            name: "email",
            label: "Email Address",
            instructions: "Enter your active email address for correspondence and case updates.",
            type: "email",
            icon: <Info className="text-gray-700" />,
            required: true,
        },
        {
            name: "phoneNumber",
            label: "Phone Number",
            instructions: "Provide your contact number with the country code if applicable.",
            icon: <Info className="text-gray-700" />,
        },
        {
            name: "caseTitle",
            label: "Case Title",
            instructions: "Enter a brief title for your legal case or complaint.",
            icon: <Lightbulb className="text-gray-700" />,
            required: true,
        },
        {
            name: "caseDescription",
            label: "Case Description",
            instructions: "Describe your legal issue in detail, including relevant events and dates.",
            type: "textarea",
            icon: <Lightbulb className="text-gray-700" />,
            required: true,
        },
        {
            name: "defendantDetails",
            label: "Defendant Details",
            instructions: "Provide the full legal name and contact information of the opposing party (if applicable).",
            type: "textarea",
            icon: <Info className="text-gray-700" />,
        },
        {
            name: "dateOfIncident",
            label: "Date of Incident",
            instructions: "Specify the exact date when the incident or issue occurred.",
            type: "date",
            icon: <Info className="text-gray-700" />,
            required: true,
        },
        {
            name: "evidence",
            label: "Evidence Links",
            instructions: "Provide links or references to any evidence that supports your claim.",
            type: "textarea",
            icon: <Shield className="text-gray-700" />,
        },
        {
            name: "additionalRemarks",
            label: "Additional Remarks",
            instructions: "Enter any extra information or remarks that might help support your legal case.",
            type: "textarea",
            icon: <FileText className="text-gray-700" />,
        },
    ]

    // State management
    const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
    const [formData, setFormData] = useState<Record<string, string>>({})
    const [listening, setListening] = useState(false)
    const [botSpeaking, setBotSpeaking] = useState(false)
    const [progress, setProgress] = useState(0)
    const [activeTab, setActiveTab] = useState("form")
    const [highContrastMode, setHighContrastMode] = useState(false)
    const [largeTextMode, setLargeTextMode] = useState(false)
    const [screenReaderMode, setScreenReaderMode] = useState(false)
    const recognitionRef = useRef<any>(null)
    const formRef = useRef<HTMLDivElement>(null)

    // Calculate progress
    useEffect(() => {
        const filledRequiredFields = fields
            .filter((field) => field.required)
            .filter((field) => formData[field.name] && formData[field.name].trim() !== "").length

        const totalRequiredFields = fields.filter((field) => field.required).length
        setProgress((filledRequiredFields / totalRequiredFields) * 100)
    }, [formData, fields])

    // Initialize the Speech Recognition API
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition()
                recognitionRef.current.continuous = false
                recognitionRef.current.interimResults = false
                recognitionRef.current.lang = "en-US"

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error:", event.error)
                    setListening(false)
                }

                recognitionRef.current.onend = () => {
                    setListening(false)
                }
            } else {
                console.error("Browser doesn't support Speech Recognition")
            }
        }
    }, [])

    // When the current field changes, update the speech recognition callback
    useEffect(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                handleInputResult(transcript)
            }
        }

        if (fields[currentFieldIndex] && screenReaderMode) {
            const { label, instructions } = fields[currentFieldIndex]
            speakText(`Field: ${label}. ${instructions}`)
        }
    }, [currentFieldIndex, screenReaderMode])

    // When speech recognition returns a transcript, update the corresponding field
    const handleInputResult = (transcript: string) => {
        const fieldName = fields[currentFieldIndex].name
        setFormData((prev) => ({ ...prev, [fieldName]: transcript }))
    }

    // Start voice recording for user input
    const startListening = () => {
        if (recognitionRef.current) {
            setListening(true)
            recognitionRef.current.start()
        }
    }

    // Navigation functions
    const handleNextField = () => {
        if (currentFieldIndex < fields.length - 1) {
            setCurrentFieldIndex(currentFieldIndex + 1)
            scrollToActiveField()
        } else {
            alert("Form completed! Data:\n" + JSON.stringify(formData, null, 2))
        }
    }

    const handlePreviousField = () => {
        if (currentFieldIndex > 0) {
            setCurrentFieldIndex(currentFieldIndex - 1)
            scrollToActiveField()
        }
    }

    const scrollToActiveField = () => {
        setTimeout(() => {
            if (formRef.current) {
                formRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }
        }, 100)
    }

    // Ask a question for the current field
    const handleAskQuestion = () => {
        speakText(
            `You can ask your question regarding ${fields[currentFieldIndex].label}. After clicking, please speak your question.`,
        )
        startListening()
    }

    // Allow manual input modifications
    const handleInputChange = (fieldName: string, value: string) => {
        setFormData((prev) => ({ ...prev, [fieldName]: value }))
    }

    // Form submission handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        alert("Form submitted! Data:\n" + JSON.stringify(formData, null, 2))
    }

    // Speak text using speech synthesis
    const speakText = (text: string) => {
        if (typeof window !== "undefined") {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.onstart = () => setBotSpeaking(true)
            utterance.onend = () => setBotSpeaking(false)
            window.speechSynthesis.speak(utterance)
        }
    }

    // Repeat the current field instructions
    const repeatInstructions = () => {
        const { label, instructions } = fields[currentFieldIndex]
        speakText(`Field: ${label}. ${instructions}`)
    }

    // Get dynamic classes based on accessibility settings
    const getAccessibleClasses = () => {
        let classes = ""
        if (highContrastMode) classes += " high-contrast"
        if (largeTextMode) classes += " large-text"
        return classes
    }

    return (
        <>
            {/* High Contrast Styles */}
            <style jsx global>{`
                .high-contrast {
                    background: #001f3f !important;
                    color: #fff !important;
                }
                .high-contrast * {
                    color: #fff !important;
                    border-color: #fff !important;
                    background: transparent !important;
                }
                .high-contrast .bg-white,
                .high-contrast .bg-gray-100,
                .high-contrast .bg-gray-200,
                .high-contrast .bg-gray-900,
                .high-contrast .bg-gray-800,
                .high-contrast .dark\\:bg-black,
                .high-contrast .dark\\:bg-gray-900 {
                    background: #001f3f !important;
                    color: #fff !important;
                }
                .high-contrast .badge,
                .high-contrast .bg-gray-100,
                .high-contrast .bg-white {
                    background: #fff !important;
                    color: #001f3f !important;
                }
                .high-contrast .btn,
                .high-contrast button {
                    background: #fff !important;
                    color: #001f3f !important;
                    border-color: #fff !important;
                }
                .high-contrast .btn svg,
                .high-contrast button svg {
                    color: #001f3f !important;
                    stroke: #001f3f !important;
                }
                .high-contrast .arrow-icon,
                .high-contrast .arrow-icon * {
                    color: #001f3f !important;
                    stroke: #001f3f !important;
                }
                .high-contrast .btn span,
                .high-contrast button span {
                    color: #001f3f !important;
                }
                .high-contrast input,
                .high-contrast textarea,
                .high-contrast select {
                    background: #001f3f !important;
                    color: #fff !important;
                    border-color: #fff !important;
                }
                .high-contrast .card,
                .high-contrast .shadow-lg,
                .high-contrast .rounded-lg,
                .high-contrast .rounded-full {
                    background: #001f3f !important;
                    color: #fff !important;
                }
                .high-contrast .bg-black,
                .high-contrast .dark\\:bg-white {
                    background: #000 !important;
                    color: #fff !important;
                }
                .high-contrast .hover\\:bg-gray-800:hover,
                .high-contrast .dark\\:hover\\:bg-gray-200:hover {
                    background: #000 !important;
                    color: #fff !important;
                }
                /* Ensure links are visible */
                .high-contrast a, .high-contrast a:visited {
                    color: #ffeb3b !important;
                    text-decoration: underline !important;
                }
            `}</style>
            <div className={`min-h-screen bg-white dark:bg-black transition-all duration-300 ${getAccessibleClasses()}`}>
                <div style={{ maxWidth: '90rem' }} className="mx-auto p-4 md:p-6">
                    <header className="mb-8 text-center">
                        <div className="flex justify-center items-center mb-4">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 100 }}
                            >
                                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg">
                                    <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white mb-2 tracking-tight">
                                        NyayaMitra
                                    </h1>
                                </div>
                            </motion.div>
                        </div>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-600 dark:text-gray-400 text-lg"
                        >
                            Powered by Gemini, Google Cloud Translate and Google Cloud Speech to text.
                        </motion.p>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-gray-600 dark:text-gray-400 text-lg"
                        >
                            Voice assisted case filing system to allow citizens to file cases with ease and accessibility in different languages.
                        </motion.p>

                        {/* Accessibility Controls */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 flex flex-wrap justify-center gap-4"
                        >
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="high-contrast" checked={highContrastMode} onCheckedChange={setHighContrastMode} />
                                            <Label htmlFor="high-contrast" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                                                High Contrast
                                            </Label>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enhances visual contrast for better readability</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="large-text" checked={largeTextMode} onCheckedChange={setLargeTextMode} />
                                            <Label htmlFor="large-text" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                                                Large Text
                                            </Label>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Increases text size for better readability</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center space-x-2">
                                            <Switch id="screen-reader" checked={screenReaderMode} onCheckedChange={setScreenReaderMode} />
                                            <Label htmlFor="screen-reader" className="text-gray-700 dark:text-gray-300 cursor-pointer">
                                                Screen Reader
                                            </Label>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Automatically reads field instructions aloud</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </motion.div>
                    </header>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-gray-900">
                            <TabsTrigger
                                value="form"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white"
                            >
                                Evidence Form
                            </TabsTrigger>
                            <TabsTrigger
                                value="assistant"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-black data-[state=active]:text-black dark:data-[state=active]:text-white"
                            >
                                Voice Assistant
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="form" className="mt-0">
                            <div className="flex flex-col lg:flex-row gap-6">
                                {/* Form Section */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="flex-1"
                                >
                                    <Card className="border border-gray-200 dark:border-gray-800 shadow-lg">
                                        <CardContent className="p-6 md:p-8">
                                            <div className="flex justify-between items-center mb-6">
                                                <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">Evidence Submission</h2>
                                                <Badge variant="outline" className="bg-gray-100 dark:bg-gray-900 px-3 py-1">
                                                    Secure & Encrypted
                                                </Badge>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="mb-8">
                                                <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5 }}
                                                        className="h-full bg-black dark:bg-white"
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <span>
                                                        Field {currentFieldIndex + 1} of {fields.length}
                                                    </span>
                                                    <span>{Math.round(progress)}% Complete</span>
                                                </div>
                                            </div>

                                            <div ref={formRef}>
                                                <form onSubmit={handleSubmit} className="space-y-6">
                                                    <AnimatePresence mode="wait">
                                                        <motion.div
                                                            key={currentFieldIndex}
                                                            initial={{ opacity: 0, x: 20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -20 }}
                                                            transition={{ duration: 0.3 }}
                                                        >
                                                            <Card className="border border-gray-200 dark:border-gray-800">
                                                                <CardContent className="p-6">
                                                                    <div className="flex items-center gap-2 mb-4">
                                                                        {fields[currentFieldIndex].icon}
                                                                        <h3
                                                                            className={`text-xl font-semibold text-black dark:text-white ${largeTextMode ? "text-2xl" : ""}`}
                                                                        >
                                                                            {fields[currentFieldIndex].label}
                                                                            {fields[currentFieldIndex].required && (
                                                                                <span className="text-gray-500 dark:text-gray-400 ml-1">*</span>
                                                                            )}
                                                                        </h3>
                                                                    </div>

                                                                    <p
                                                                        className={`text-gray-600 dark:text-gray-400 mb-6 ${largeTextMode ? "text-lg" : "text-sm"}`}
                                                                    >
                                                                        {fields[currentFieldIndex].instructions}
                                                                    </p>

                                                                    {fields[currentFieldIndex].type === "textarea" ? (
                                                                        <Textarea
                                                                            value={formData[fields[currentFieldIndex].name] || ""}
                                                                            onChange={(e) => handleInputChange(fields[currentFieldIndex].name, e.target.value)}
                                                                            placeholder={`Enter ${fields[currentFieldIndex].label}`}
                                                                            className={`min-h-[120px] bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 ${largeTextMode ? "text-lg" : ""
                                                                                } ${highContrastMode
                                                                                    ? "bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                                                                    : ""
                                                                                }`}
                                                                        />
                                                                    ) : fields[currentFieldIndex].type === "date" ? (
                                                                        <Input
                                                                            type="date"
                                                                            value={formData[fields[currentFieldIndex].name] || ""}
                                                                            onChange={(e) => handleInputChange(fields[currentFieldIndex].name, e.target.value)}
                                                                            className={`w-full bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 ${largeTextMode ? "text-lg h-12" : ""
                                                                                } ${highContrastMode
                                                                                    ? "bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                                                                    : ""
                                                                                }`}
                                                                        />
                                                                    ) : (
                                                                        <Input
                                                                            type={fields[currentFieldIndex].type || "text"}
                                                                            value={formData[fields[currentFieldIndex].name] || ""}
                                                                            onChange={(e) => handleInputChange(fields[currentFieldIndex].name, e.target.value)}
                                                                            placeholder={`Enter ${fields[currentFieldIndex].label}`}
                                                                            className={`w-full bg-white dark:bg-gray-950 border-gray-300 dark:border-gray-700 ${largeTextMode ? "text-lg h-12" : ""
                                                                                } ${highContrastMode
                                                                                    ? "bg-white dark:bg-black border-black dark:border-white text-black dark:text-white"
                                                                                    : ""
                                                                                }`}
                                                                        />
                                                                    )}

                                                                    <div className="flex justify-between mt-6">
                                                                        <Button
                                                                            type="button"
                                                                            onClick={handlePreviousField}
                                                                            disabled={currentFieldIndex === 0}
                                                                            variant={highContrastMode ? "default" : "outline"}
                                                                            className={`flex items-center gap-2 ${highContrastMode
                                                                                ? "bg-black text-white dark:bg-white dark:text-black"
                                                                                : "bg-white text-black dark:bg-black dark:text-white border-gray-300 dark:border-gray-700"
                                                                                } ${largeTextMode ? "text-lg h-12 px-6" : ""}`}
                                                                        >
                                                                            <ChevronLeft className="arrow-icon" size={largeTextMode ? 20 : 16} /> Previous
                                                                        </Button>

                                                                        {currentFieldIndex === fields.length - 1 ? (
                                                                            <Button
                                                                                type="submit"
                                                                                className={`bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 ${largeTextMode ? "text-lg h-12 px-6" : ""
                                                                                    }`}
                                                                            >
                                                                                Submit Evidence <Send size={largeTextMode ? 20 : 16} />
                                                                            </Button>
                                                                        ) : (
                                                                            <Button
                                                                                type="button"
                                                                                onClick={handleNextField}
                                                                                className={`bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 ${largeTextMode ? "text-lg h-12 px-6" : ""
                                                                                    }`}
                                                                            >
                                                                                Next <ChevronRight className="arrow-icon" size={largeTextMode ? 20 : 16} />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </motion.div>
                                                    </AnimatePresence>

                                                    {/* Quick Actions */}
                                                    <div className="flex flex-wrap gap-3 mt-6">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={startListening}
                                                            disabled={listening}
                                                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        >
                                                            {listening ? <MicOff size={16} /> : <Mic size={16} />}
                                                            <span className="ml-2">{listening ? "Listening..." : "Voice Input"}</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={repeatInstructions}
                                                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        >
                                                            <Volume2 size={16} />
                                                            <span className="ml-2">Hear Instructions</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        >
                                                            <Upload size={16} />
                                                            <span className="ml-2">Upload Files</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                                                        >
                                                            <Accessibility size={16} />
                                                            <span className="ml-2">Accessibility</span>
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Security Info */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.5 }}
                                        className="mt-6"
                                    >
                                        <Card className="border border-gray-200 dark:border-gray-800">
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <Shield className="text-gray-700 dark:text-gray-300" size={24} />
                                                    <div>
                                                        <h3 className="text-black dark:text-white font-medium">Blockchain Secured</h3>
                                                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                                                            Your evidence is encrypted and tamper-proof on the blockchain
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </motion.div>

                                {/* Voice Assistant - Only visible on larger screens */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="hidden lg:block lg:w-[380px]"
                                >
                                    <Card className="border border-gray-200 dark:border-gray-800 shadow-lg h-full">
                                        <CardContent className="p-6 flex flex-col h-full">
                                            <h2 className="text-2xl font-bold text-black dark:text-white mb-6 text-center">
                                                AI Voice Assistant
                                            </h2>

                                            <div className="flex-1 flex items-center justify-center">
                                                <VoiceAssistant isListening={listening} isSpeaking={botSpeaking} />
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <Button
                                                    type="button"
                                                    onClick={startListening}
                                                    disabled={listening}
                                                    className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2"
                                                >
                                                    {listening ? <MicOff size={18} /> : <Mic size={18} />}
                                                    {listening ? "Listening..." : "Record Voice Input"}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    onClick={repeatInstructions}
                                                    variant="outline"
                                                    className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center gap-2"
                                                >
                                                    <Volume2 size={18} />
                                                    Repeat Instructions
                                                </Button>

                                                <Button
                                                    type="button"
                                                    onClick={handleAskQuestion}
                                                    variant="outline"
                                                    className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center gap-2"
                                                >
                                                    <HelpCircle size={18} />
                                                    Ask for Help
                                                </Button>
                                            </div>

                                            <div className="mt-auto pt-6">
                                                <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                                    <p>All evidence is securely stored on blockchain</p>
                                                    <p className="mt-1">Your data is encrypted and tamper-proof</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </TabsContent>

                        <TabsContent value="assistant" className="mt-0">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                                <Card className="border border-gray-200 dark:border-gray-800 shadow-lg">
                                    <CardContent className="p-6 flex flex-col items-center">
                                        <h2 className="text-2xl font-bold text-black dark:text-white mb-6 text-center">AI Voice Assistant</h2>

                                        <div className="w-full max-w-md mx-auto">
                                            <VoiceAssistant isListening={listening} isSpeaking={botSpeaking} />
                                        </div>

                                        <div className="mt-8 space-y-4 w-full max-w-md">
                                            <Button
                                                type="button"
                                                onClick={startListening}
                                                disabled={listening}
                                                className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center justify-center gap-2 h-14 text-lg"
                                            >
                                                {listening ? <MicOff size={24} /> : <Mic size={24} />}
                                                {listening ? "Listening..." : "Record Voice Input"}
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={repeatInstructions}
                                                variant="outline"
                                                className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center gap-2 h-14 text-lg"
                                            >
                                                <Volume2 size={24} />
                                                Repeat Instructions
                                            </Button>

                                            <Button
                                                type="button"
                                                onClick={handleAskQuestion}
                                                variant="outline"
                                                className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center gap-2 h-14 text-lg"
                                            >
                                                <HelpCircle size={24} />
                                                Ask for Help
                                            </Button>
                                        </div>

                                        <div className="mt-8 w-full max-w-md">
                                            <Card className="border border-gray-200 dark:border-gray-800">
                                                <CardContent className="p-4">
                                                    <h3 className="text-black dark:text-white font-medium mb-2">Voice Commands</h3>
                                                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                                                        <li className="flex items-center gap-2">
                                                            <CheckCircle2 size={16} className="text-gray-700 dark:text-gray-300" />
                                                            Say "next" to move to the next field
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <CheckCircle2 size={16} className="text-gray-700 dark:text-gray-300" />
                                                            Say "previous" to go back to the previous field
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <CheckCircle2 size={16} className="text-gray-700 dark:text-gray-300" />
                                                            Say "help" to get assistance with the current field
                                                        </li>
                                                        <li className="flex items-center gap-2">
                                                            <CheckCircle2 size={16} className="text-gray-700 dark:text-gray-300" />
                                                            Say "submit" when you're ready to submit the form
                                                        </li>
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </>
    )
}