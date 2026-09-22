(start Credit card needed)
Customer: user Apply for credit card
Banking Officer: receive Receive application
Banking Officer: user Check provided information
Is information complete?
No
Banking Officer: user Ask customer to submit missing information
(finish Application stopped)

(start Credit card needed)
Customer: user Apply for credit card
Banking Officer: receive Receive application
Banking Officer: user Check provided information
Is information complete?
Yes
Banking Officer: service Perform credit check
What is the credit check result?
Approved
Banking Officer: service Create card account
Banking Officer: user Order card
Banking Officer: send Send approval message
(finish Customer notified of approval)

(start Credit card needed)
Customer: user Apply for credit card
Banking Officer: receive Receive application
Banking Officer: user Check provided information
Is information complete?
Yes
Banking Officer: service Perform credit check
What is the credit check result?
Borderline
Banking Officer: user Send application to supervisor
Supervisor: user Perform manual review
Is application approved?
Yes
Banking Officer: service Create card account
Banking Officer: user Order card
Banking Officer: send Send approval message
(finish Customer notified of approval)

(start Credit card needed)
Customer: user Apply for credit card
Banking Officer: receive Receive application
Banking Officer: user Check provided information
Is information complete?
Yes
Banking Officer: service Perform credit check
What is the credit check result?
Borderline
Banking Officer: user Send application to supervisor
Supervisor: user Perform manual review
Is application approved?
No
Banking Officer: send Send rejection message
(finish Customer notified of rejection)

(start Credit card needed)
Customer: user Apply for credit card
Banking Officer: receive Receive application
Banking Officer: user Check provided information
Is information complete?
Yes
Banking Officer: service Perform credit check
What is the credit check result?
Declined
Banking Officer: send Send rejection message
(finish Customer notified of rejection)