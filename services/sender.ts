
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

var oAuth2Client: any = undefined;

export const Setup = () => {
    oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

export const SendMail = async (dest: string, subject: string, text: string): Promise<boolean> => {
  try {
    if(!oAuth2Client)
        Setup();
    const accessToken = await oAuth2Client.getAccessToken();

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: dest,
      subject: subject,
      text: text,
    };
    return !!(await transport.sendMail(mailOptions));
  } catch (error: any) {
    return false;
  }
}

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