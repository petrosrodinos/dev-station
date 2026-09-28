import { EmailTemplates } from '@/integrations/notifications/resend/interfaces/mail.interfaces';

export const EmailConfig = {
    email_addresses: {
        verification: 'info@logiqdev.com',
        alert: 'info@logiqdev.com',
    },
    templates: {
        waitlist: {
            subject: 'Project - Waitlist',
            template_id: EmailTemplates.WAITLIST,
        },
        password_reset: {
            subject: 'Reset your password',
            template_id: EmailTemplates.PASSWORD_RESET,
        },
        organization_invitation: {
            subject: (organizationName: string) =>
                `You're invited to ${organizationName} on Dev Station`,
            template_id: EmailTemplates.ORGANIZATION_INVITATION,
        },
    }
}
