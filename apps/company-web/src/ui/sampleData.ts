export const SAMPLE_DSL = `(start New employee joins)
HR: send Welcome email
HR: service Create accounts
IT: manual Prepare hardware
Is the new hire remote?
Yes
IT: send Ship hardware
New Hire: user Sign documents
New Hire: user Attend orientation
(finish Remote employee onboarded)

(start New employee joins)
HR: send Welcome email
HR: service Create accounts
IT: manual Prepare hardware
Is the new hire remote?
No
New Hire: manual Pick up hardware on day one
New Hire: user Sign documents
New Hire: user Attend orientation
(finish On-site employee onboarded)`;

export const STARTER_DESCRIPTION =
  "A new employee joins the company. HR sends a welcome email and creates accounts. " +
  "IT prepares hardware. The new hire signs documents and attends an orientation. " +
  "If they are remote, hardware is shipped; otherwise it is picked up on day one.";

export const STARTER_ONBOARD =
  "A new employee joins the company. HR sends a welcome email and creates the accounts. " +
  "IT prepares a hardware kit. If the new hire is remote, IT ships the hardware to their home; " +
  "otherwise it is staged for pickup on day one. The new hire signs the offer documents, " +
  "receives the hardware, and attends orientation. Once orientation is complete, the case is closed.";

export const STARTER_ORDER =
  "A customer places an order on the website. The system validates payment. " +
  "If payment is declined, the customer is notified and the order is cancelled. " +
  "If payment succeeds, the warehouse picks the items and ships the order. " +
  "The customer receives a tracking link by email. Once delivery is confirmed, the order is closed.";

export const STARTER_INCIDENT =
  "An employee witnesses a workplace incident and notifies their employer. " +
  "The employer assesses whether it was a fatality or a serious injury. " +
  "If serious, the employer checks the emergency report status; if not, they assess the absence duration. " +
  "If the absence is over three days, the case must be reported within five days. " +
  "The employer reports the accident to the labour inspectorate and the insurance provider.";
