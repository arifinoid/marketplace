/** Payload accepted by POST /api/messages (after validation). */
export interface CreateMessageInput {
  listing_id: string
  buyer_email: string
  message: string
}

export interface Message {
  id: string
  listing_id: string
  buyer_email: string
  seller_email: string
  message: string
  created_at: string
}
