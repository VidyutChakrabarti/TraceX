"use client"
import { useState, useEffect } from 'react'
import {
    Box,
    Button,
    Checkbox,
    IconButton,
    Input,
    Text,
    VStack,
    useDisclosure,
    useToast,
    Link,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
} from '@chakra-ui/react'
import { InfoIcon } from '@chakra-ui/icons'
import emailjs from 'emailjs-com'

const SERVICE_ID = 'eventhorizon'
const TEMPLATE_ID = 'template_aeysuh5'
const PUBLIC_KEY = 'DvoyXlCamPhwFBgnF'

export default function RequestAccess() {
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [email, setEmail] = useState('')
    const [agreed, setAgreed] = useState(false)
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    const { isOpen: isTermsOpen, onOpen: onTermsOpen, onClose: onTermsClose } =
        useDisclosure()
    const { isOpen: isInfoOpen, onOpen: onInfoOpen, onClose: onInfoClose } =
        useDisclosure()

    useEffect(() => {
        emailjs.init(PUBLIC_KEY)
    }, [])

    const handleSubmit = async () => {
        if (!name || !address || !email) {
            toast({
                title: 'Missing information',
                description: 'Please fill in your name, wallet address, and email.',
                status: 'warning',
                isClosable: true,
            })
            return
        }

        setLoading(true)
        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID, { name, address, email })
            toast({
                title: 'Request sent!',
                description: `Hi ${name}, a confirmation has been sent to ${email}.`,
                status: 'success',
                isClosable: true,
            })
            setName('')
            setAddress('')
            setEmail('')
            setAgreed(false)
        } catch (err) {
            console.error('EmailJS error:', err)
            toast({
                title: 'Error sending email',
                description: 'Please try again later.',
                status: 'error',
                isClosable: true,
            })
        } finally {
            setLoading(false)
        }
    }

    const inputStyles = {
        borderColor: 'gray.500',
        borderWidth: '2px',
        _focus: { borderColor: 'blue.500', boxShadow: '0 0 0 1px blue.500' },
        fontSize: 'md',
        p: 4,
    }

    return (
        <Box
            position="relative"
            maxW="lg"
            mx="auto"
            mt="12"
            p="8"
            borderWidth="3px"
            borderColor="black"
            borderRadius="lg"
        >
            {/* Info Button */}
            <IconButton
                icon={<InfoIcon />}
                position="absolute"
                top="4"
                right="4"
                size="md"
                variant="ghost"
                aria-label="Info"
                onClick={onInfoOpen}
            />

            <Text fontSize="3xl" fontWeight="bold" mb="8" textAlign="center">
                Request Access
            </Text>

            <VStack spacing="6">
                <Input
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    {...inputStyles}
                />
                <Input
                    placeholder="Your wallet address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    {...inputStyles}
                />
                <Input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    {...inputStyles}
                />

                <Checkbox
                    isChecked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    fontSize="md"
                >
                    I agree to the{' '}
                    <Link color="blue.500" onClick={onTermsOpen}>
                        Terms & Conditions
                    </Link>
                </Checkbox>

                <Button
                    w="full"
                    size="lg"
                    colorScheme="blue"
                    onClick={handleSubmit}
                    isLoading={loading}
                    isDisabled={!agreed}
                >
                    Submit
                </Button>
            </VStack>

            <Text mt="8" fontSize="sm" color="gray.600" textAlign="center">
                You will be issued <strong>Collector rights</strong> within 1 day. This
                step is necessary for onboarding your wallet address into the private
                network of <strong>TraceX</strong>.
            </Text>

            {/* Terms & Conditions Modal */}
            <Modal isOpen={isTermsOpen} onClose={onTermsClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Terms & Conditions</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text mb="3">
                            1. This application is nonprofit and intended solely to aid
                            investigative agencies.
                        </Text>
                        <Text mb="3">
                            2. You must not use this app for harmful or malicious purposes.
                        </Text>
                        <Text mb="3">
                            3. Do not exceed authorized usage limits. Any abuse may result in
                            access revocation.
                        </Text>
                        <Text mb="3">
                            • Our Commitments:
                            <br />
                            1. We guarantee the protection of your privacy. Your account and email addresses will never be shared with any external third-party applications.<br />
                            2. We will not use your data for any purpose other than to provide you with the services you have requested.
                        </Text>

                    </ModalBody>
                    <ModalFooter>
                        <Button
                            onClick={onInfoClose}
                            style={{ backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer' }}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Info Modal */}
            <Modal isOpen={isInfoOpen} onClose={onInfoClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Info</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Text mb="2">You are seeing this form for one of the two reasons:</Text>
                        <Text>• You do not have a proper wallet connected to TraceX</Text>
                        <Text>To resolve this: <br />You must configure and make an account using Metamask and then use the Connect Wallet button in TraceX to connect your account to TraceX. You will then be rerouted to this form again to request access permission.</Text><br />
                        <Text>• If you have a proper wallet connected to our application and yet seeing this form then it means your account address doesn't have the necessary permissions needed to access TraceX in which case you must fill out the application form to request permissions from Admin.</Text>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            onClick={onInfoClose}
                            style={{ backgroundColor: '#1e3a8a', color: 'white', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer' }}
                        >
                            Close
                        </Button>

                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    )
}
