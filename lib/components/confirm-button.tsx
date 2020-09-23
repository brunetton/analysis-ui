import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  useDisclosure
} from '@chakra-ui/core'
import {useRef, useState} from 'react'

export default function ConfirmButton({action, description, onConfirm, ...p}) {
  const {isOpen, onOpen, onClose} = useDisclosure()

  return (
    <>
      <Button {...p} onClick={onOpen}>
        {action}
      </Button>

      {isOpen && (
        <ConfirmDialog
          action={action}
          description={description}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      )}
    </>
  )
}

export function ConfirmDialog({action, description, onClose, onConfirm}) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef()

  function doAction() {
    setConfirming(true)
    onConfirm()
  }

  return (
    <AlertDialog
      isOpen
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      size='lg'
    >
      <AlertDialogOverlay />
      <AlertDialogContent borderRadius='md'>
        <AlertDialogHeader fontSize='xl' fontWeight='bold'>
          Confirm
        </AlertDialogHeader>
        <AlertDialogBody fontSize='lg'>{description}</AlertDialogBody>
        <AlertDialogFooter>
          <Button
            isDisabled={confirming}
            onClick={onClose}
            ref={cancelRef}
            size='lg'
          >
            Cancel
          </Button>
          <Button
            isLoading={confirming}
            ml={3}
            onClick={doAction}
            size='lg'
            variantColor='red'
          >
            Confirm: {action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
