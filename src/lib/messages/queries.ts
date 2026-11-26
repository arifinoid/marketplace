import { getSupabase } from "@/lib/supabase/server"
import type { CreateMessageInput, Message } from "./types"

export class ListingNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Listing ${listingId} was not found`)
    this.name = "ListingNotFoundError"
  }
}

export async function listMessages(listingId: string): Promise<Message[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("messages")
    .select("id, listing_id, buyer_email, seller_email, message, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to load messages: ${error.message}`)
  return data as Message[]
}

export async function createMessage(
  input: CreateMessageInput,
): Promise<Message> {
  const supabase = getSupabase()

  // Derive the recipient from the listing; the client never supplies it.
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_email")
    .eq("id", input.listing_id)
    .maybeSingle()

  if (listingError) {
    throw new Error(`Failed to load listing: ${listingError.message}`)
  }
  if (!listing) {
    throw new ListingNotFoundError(input.listing_id)
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      listing_id: input.listing_id,
      buyer_email: input.buyer_email,
      seller_email: listing.seller_email,
      message: input.message,
    })
    .select("id, listing_id, buyer_email, seller_email, message, created_at")
    .single()

  if (error) throw new Error(`Failed to send message: ${error.message}`)
  return data as Message
}
