import { z } from 'zod'

/** Normalizes the typed confirmation before comparison with the page's word. */
export const accountDeletionConfirmationSchema = z.string().trim().toUpperCase().min(1)
