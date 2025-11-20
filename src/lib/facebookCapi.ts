// src/lib/facebookCapi.ts

import axios from 'axios';
import crypto from 'crypto';
import dotenv from "dotenv";
import { FastifyReply } from 'fastify';
dotenv.config()

/**
 * Mã hóa dữ liệu email theo chuẩn SHA-256 của Facebook.
 * @param email - Địa chỉ email cần mã hóa.
 * @returns Chuỗi email đã được mã hóa.
 */
function hashEmail(email: string): string {
  if (!email) return '';
  const normalizedEmail = email.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

export async function sendCompleteRegistrationEvent(email: string, reply:FastifyReply): Promise<void> {
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  const accessToken = process.env.FACEBOOK_CAPI_ACCESS_TOKEN;

  // Kiểm tra xem các biến môi trường đã được thiết lập chưa
  if (!pixelId || !accessToken) {
    return reply.status(400).send({
      message: "configured",
      success:false
    });
  }

  // Dữ liệu người dùng, chỉ chứa email đã mã hóa
  const userData = {
    em: [hashEmail(email)],
  };

  // Payload sự kiện đầy đủ
  const eventData = {
    data: [
      {
        event_name: 'CompleteRegistration',
        event_time: Math.floor(Date.now() / 1000),
        event_id: crypto.randomUUID(),
        action_source: 'website',
        user_data: userData,
      },
    ],
  };

  // URL của Graph API
  const url = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`;

  try {
    const response = await axios.post(url, eventData, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('Facebook CAPI: CompleteRegistration event sent successfully.', response.data);
    console.log(response);

  } catch (error) {
    console.log(error);

    if (axios.isAxiosError(error)) {
      console.error('Facebook CAPI Error:', error.response?.data || error.message);
    } else {
      console.error('An unexpected error occurred while sending CAPI event:', error);
    }
  }
}