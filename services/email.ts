import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';


export const SendMail = async (dest: string, subject: string, text: string): Promise<boolean> => {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASS
        }
    });

    var mailOptions = {
        from: process.env.EMAIL,
        to: dest,
        subject: subject,
        text: text
    };

    const mail = await transporter.sendMail(mailOptions)
    return !!mail
}
