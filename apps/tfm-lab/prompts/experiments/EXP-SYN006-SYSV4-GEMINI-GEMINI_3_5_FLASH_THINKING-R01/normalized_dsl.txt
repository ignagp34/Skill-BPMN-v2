(start Application requested)
Customer: Apply for card
Officer: receive Receive application
Officer: user Check information
Is information complete?
No
Officer: send Ask for missing information
(finish Application stopped)

(start Application requested)
Customer: Apply for card
Officer: receive Receive application
Officer: user Check information
Is information complete?
Yes
Officer: service Perform credit check
What is the credit result?
Approved
Officer: service Create card account
Officer: service Order card
Officer: send Send approval message
(finish Customer notified of approval)

(start Application requested)
Customer: Apply for card
Officer: receive Receive application
Officer: user Check information
Is information complete?
Yes
Officer: service Perform credit check
What is the credit result?
Borderline
Officer: send Send application to supervisor
Supervisor: user Perform manual review
Is application approved?
Yes
Officer: service Create card account
Officer: service Order card
Officer: send Send approval message
(finish Customer notified of approval)

(start Application requested)
Customer: Apply for card
Officer: receive Receive application
Officer: user Check information
Is information complete?
Yes
Officer: service Perform credit check
What is the credit result?
Borderline
Officer: send Send application to supervisor
Supervisor: user Perform manual review
Is application approved?
No
Officer: send Send rejection message
(finish Customer notified of rejection)

(start Application requested)
Customer: Apply for card
Officer: receive Receive application
Officer: user Check information
Is information complete?
Yes
Officer: service Perform credit check
What is the credit result?
Declined
Officer: send Send rejection message
(finish Customer notified of rejection)