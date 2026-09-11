MaleSender — Project Specification

1. Project Overview

A self-hosted email outreach management tool for importing leads, managing multiple authorized email accounts, creating campaigns, scheduling emails, and sending them step-by-step with controlled rate limits.

The application should prioritize deliverability, account safety, unsubscribe handling, and transparent sending controls.

Important: The system must not be designed to bypass provider limits, spam protections, account bans, or abuse controls. Sending should use legitimate accounts and respect provider policies, recipient consent/legitimate outreach requirements, unsubscribe requests, and applicable laws.

2. Technology Stack

Frontend

Next.js

TypeScript

Tailwind CSS

shadcn/ui

Backend

Node.js

TypeScript

REST API

Database

MySQL

Queue / Scheduling

For the first version, keep the architecture simple.

Recommended:

Node.js worker

MySQL-backed job/status records

Cron/scheduler for processing scheduled jobs

If the application later needs high-volume processing, Redis + BullMQ can be added.

Email Sending — Free/Low-Cost Approach

The project should support providers that offer free tiers or free usage where currently available.

The application should use provider APIs or authenticated SMTP, depending on the provider.

Possible development/testing options:

Gmail / Google Workspace SMTP or API, subject to Google's current sending limits and policies

Microsoft Outlook/Microsoft 365 SMTP or API, subject to Microsoft's current limits and policies

Other providers with a legitimate free tier

Do not assume that a provider's free tier is unlimited. Provider limits and terms can change.

For production, the application should make the email provider configurable rather than hard-coding one provider.

3. Main Features

3.1 Authentication

Admin authentication for the application.

Features:

Login

Logout

Password hashing

Session management

Protected dashboard

Optional 2FA later

4. Lead Management

4.1 Import Leads

Support CSV import.

Example CSV:

first_name,last_name,company,email,website,phone
John,Doe,ABC Plumbing,john@example.com,https://example.com,123456789
Jane,Smith,XYZ Plumbing,jane@example.com,https://xyz.com,987654321

Lead fields

ID

First name

Last name

Company

Email

Website

Phone

Custom fields

Status

Tags

Created date

Updated date

Import functionality

Upload CSV

Map CSV columns

Validate email format

Detect duplicates

Skip invalid records

Show import summary

Store import history

5. Email Account Management

The user can add email accounts that they are authorized to use.

Example:

Email: outreach@example.com
Provider: Gmail
Status: Active
Daily Limit: configurable
Hourly Limit: configurable
Sent Today: 23

Account features

Add account

Edit account

Enable/disable account

Test connection

View sending statistics

Configure conservative sending limits

Store provider credentials securely

Security

Never store plaintext passwords in the database.

Use:

OAuth where supported

Application passwords where appropriate

Environment variables/secrets management

Encryption for sensitive stored credentials

6. Campaign Management

A campaign contains:

Campaign name

Lead list

Email account pool

Email template

Sending schedule

Sending limits

Campaign status

Statuses:

DRAFT
SCHEDULED
RUNNING
PAUSED
COMPLETED
CANCELLED

7. Email Templates

Templates should support variables.

Example:

Hi {{first_name}},

I noticed that {{company}} has a website that could potentially
improve its search visibility.

I would be happy to share a few SEO opportunities I found.

Best,
{{sender_name}}

Supported variables:

{{first_name}}
{{last_name}}
{{company}}
{{email}}
{{website}}
{{sender_name}}

Unknown variables should be detected before a campaign starts.

8. Sending Scheduler

The sending system should process emails as jobs.

Basic flow:

Campaign
   ↓
Find eligible leads
   ↓
Check suppression/unsubscribe status
   ↓
Check sender account status
   ↓
Check account sending limits
   ↓
Create email job
   ↓
Schedule job
   ↓
Worker processes job
   ↓
Send email
   ↓
Record result

Sending rules

The scheduler should support:

Maximum emails per hour

Maximum emails per day

Sending start time

Sending end time

Allowed weekdays

Pause/resume

Retry failed jobs

Stop when provider/account limits are reached

Avoid intentionally randomizing behavior for the purpose of evading provider detection or bans.

A small scheduling jitter can be used for natural workload distribution, but it must remain within configured limits.

9. Email Job System

Each email should have a job record.

Example:

email_jobs
-------------------------
id
campaign_id
lead_id
email_account_id
scheduled_at
status
attempts
sent_at
failed_at
error_message
provider_message_id
created_at
updated_at

Job statuses:

PENDING
PROCESSING
SENT
FAILED
CANCELLED
SKIPPED

10. Unsubscribe / Suppression

This is mandatory.

Before sending an email, check whether the recipient is suppressed.

Suppression reasons:

UNSUBSCRIBED
BOUNCED
COMPLAINT
MANUALLY_BLOCKED

If a recipient is suppressed:

Do not send

The application should provide an unsubscribe mechanism appropriate to the campaign and applicable law.

11. Bounce Handling

The system should record bounced emails.

Example:

email_events
-------------------------
id
email_job_id
lead_id
event_type
provider_event_id
event_data
created_at

Possible event types:

SENT
DELIVERED
BOUNCED
COMPLAINT
UNSUBSCRIBED
FAILED

A hard bounce should automatically add the address to the suppression list.

12. Dashboard

Dashboard should show:

Total Leads
Active Campaigns
Emails Sent
Emails Failed
Bounces
Unsubscribes
Available Sender Accounts
Emails Sent Today

Campaign table:

Campaign
Leads
Sent
Failed
Bounced
Unsubscribed
Status
Progress

13. MySQL Database Design

Initial tables:

users
email_accounts
leads
lead_lists
lead_list_members
campaigns
campaign_leads
email_templates
campaign_steps
email_jobs
email_events
suppressions
sending_limits

users

id
name
email
password_hash
created_at
updated_at

email_accounts

id
user_id
email
provider
auth_type
credentials_reference
daily_limit
hourly_limit
sent_today
last_sent_at
status
created_at
updated_at

leads

id
first_name
last_name
company
email
website
phone
custom_data
status
created_at
updated_at

campaigns

id
user_id
name
status
start_at
end_at
daily_limit
hourly_limit
created_at
updated_at

email_templates

id
user_id
name
subject
body
created_at
updated_at

email_jobs

id
campaign_id
lead_id
email_account_id
template_id
scheduled_at
status
attempts
provider_message_id
error_message
sent_at
created_at
updated_at

suppressions

id
email
reason
source
created_at

14. Backend Structure

Recommended Node.js + TypeScript structure:

backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── workers/
│   ├── jobs/
│   ├── email/
│   ├── scheduler/
│   ├── utils/
│   ├── types/
│   └── app.ts
├── tests/
├── package.json
├── tsconfig.json
└── .env.example

15. Frontend Structure

Recommended Next.js structure:

frontend/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── leads/
│   ├── email-accounts/
│   ├── campaigns/
│   ├── templates/
│   ├── settings/
│   └── layout.tsx
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── leads/
│   ├── campaigns/
│   └── email-accounts/
├── lib/
├── hooks/
├── types/
└── public/

16. API Routes

Initial API design:

Authentication

POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

Leads

GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PUT    /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/import

Email Accounts

GET    /api/email-accounts
POST   /api/email-accounts
GET    /api/email-accounts/:id
PUT    /api/email-accounts/:id
DELETE /api/email-accounts/:id
POST   /api/email-accounts/:id/test
POST   /api/email-accounts/:id/enable
POST   /api/email-accounts/:id/disable

Campaigns

GET    /api/campaigns
POST   /api/campaigns
GET    /api/campaigns/:id
PUT    /api/campaigns/:id
DELETE /api/campaigns/:id

POST   /api/campaigns/:id/start
POST   /api/campaigns/:id/pause
POST   /api/campaigns/:id/resume
POST   /api/campaigns/:id/cancel

Templates

GET    /api/templates
POST   /api/templates
PUT    /api/templates/:id
DELETE /api/templates/:id

Statistics

GET /api/dashboard/stats
GET /api/campaigns/:id/stats
GET /api/email-accounts/:id/stats

17. Environment Variables

Example:

NODE_ENV=development

PORT=4000

DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/email_tool

JWT_SECRET=change_me

ENCRYPTION_KEY=change_me

FRONTEND_URL=http://localhost:3000

Email-provider credentials should be stored securely and should not be committed to Git.

18. Free Development Setup

For local development, the stack can be run without paid infrastructure:

Next.js
    +
Node.js
    +
MySQL
    +
Local development environment

For email testing, use a development/test mailbox or a mail-testing service rather than sending a large real campaign.

For real sending, use an email provider/account whose free allowance and sending policies explicitly permit the intended use.

19. Important Sending Safeguards

Before a job is sent, the worker must verify:

1. Campaign is RUNNING
2. Lead email is valid
3. Lead is not suppressed
4. Sender account is ACTIVE
5. Hourly limit is not exceeded
6. Daily limit is not exceeded
7. Current time is inside campaign sending window
8. Provider credentials are valid
9. Message contains required unsubscribe/suppression handling

Only after these checks should the job be sent.

20. Error Handling

Common errors:

AUTH_FAILED
RATE_LIMITED
MAILBOX_UNAVAILABLE
INVALID_RECIPIENT
CONNECTION_ERROR
PROVIDER_ERROR
BOUNCED
UNKNOWN_ERROR

The worker should:

Record the error

Increment attempts

Retry temporary failures

Avoid retrying permanent recipient failures

Respect provider rate limits

Pause an account if repeated authentication failures occur

21. Security Requirements

Hash user passwords with Argon2 or bcrypt

Encrypt sensitive email credentials

Never commit .env

Add .env to .gitignore

Validate all API input

Sanitize imported CSV data

Protect APIs with authentication

Add rate limiting to application APIs

Use HTTPS in production

Log security-relevant events

Never expose provider credentials to the frontend

22. MVP Development Order

Build in this order:

Phase 1 — Project Setup

Next.js
TypeScript
Tailwind
shadcn/ui
Node.js
MySQL

Phase 2 — Authentication

Login
Session
Protected dashboard

Phase 3 — Leads

CSV upload
Import
Validation
Duplicate detection
Lead table

Phase 4 — Email Accounts

Add account
Connect/test account
Enable/disable
Sending limits

Phase 5 — Templates

Create template
Edit template
Variables
Preview

Phase 6 — Campaigns

Create campaign
Select leads
Select authorized sender accounts
Configure schedule

Phase 7 — Sending Worker

Create jobs
Schedule jobs
Process jobs
Send emails
Record results
Retry temporary failures

Phase 8 — Suppression

Unsubscribe
Bounce handling
Block list
Pre-send suppression check

Phase 9 — Dashboard

Campaign progress
Sending statistics
Failures
Bounces
Unsubscribes
Account statistics

23. Future Features

After the MVP is stable:

- Multiple campaign steps
- Follow-up sequences
- Advanced segmentation
- A/B testing
- Email preview
- Provider webhooks
- Bounce processing
- Delivery tracking
- Analytics
- CSV export
- Team accounts
- Role-based permissions
- Redis + BullMQ
- Docker deployment
- Cloud deployment

24. Recommended Final Architecture

                 ┌─────────────────────┐
                 │      Next.js        │
                 │TypeScript + Tailwind│
                 │     shadcn/ui       │
                 └──────────┬──────────┘
                            │
                         REST API
                            │
                 ┌──────────▼──────────┐
                 │    Node.js API      │
                 │     TypeScript      │
                 └──────────┬──────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
          ┌───────┐     ┌───────┐    ┌──────────┐
          │ MySQL │     │Scheduler│  │ Email    │
          │       │     │ Worker│    │ Provider │
          └───────┘     └───────┘    └──────────┘
                             │
                             ▼
                       Email Jobs
                             │
                             ▼
                    Sending + Logging

25. Key Principle

The goal is not to make a system that "hides" sending activity from email providers.

The goal is to make a system that:

Sends only through accounts you are authorized to use

Controls sending volume

Respects provider limits

Prevents sending to unsubscribed/bounced addresses

Handles errors correctly

Keeps credentials secure

Provides clear campaign visibility

Can scale later without redesigning the entire application

This architecture is intentionally simple enough for an MVP while leaving a clean path to Redis/BullMQ and larger-scale infrastructure later.