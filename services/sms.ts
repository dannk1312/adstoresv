
import twilio from 'twilio';

export const SendSMS = async (body: string, to: string): Promise<boolean> => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const client: twilio.Twilio = twilio(accountSid, authToken)
    const item = await client.messages.create({
        body: body,
        messagingServiceSid: process.env.TWILIO_MESS_SERVICESID,
        to: to
    })
    return !!item
}
