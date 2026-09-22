Customer:
(start Credit card requested)
user Apply for credit card

Banking Officer:
user Receive application
user Check provided information
Is application complete?
No
user Ask customer to submit missing information
(finish Application stopped)

Customer:
(start Credit card requested)
user Apply for credit card

Banking Officer:
user Receive application
user Check provided information
Is application complete?
Yes
service Perform credit check
What is the credit check result?
Approved
service Create card account
service Order card
send Send approval message
Customer: receive Receive approval message
(finish Credit card approved)

Customer:
(start Credit card requested)
user Apply for credit card

Banking Officer:
user Receive application
user Check provided information
Is application complete?
Yes
service Perform credit check
What is the credit check result?
Declined
send Send rejection message
Customer: receive Receive rejection message
(finish Credit card rejected)

Customer:
(start Credit card requested)
user Apply for credit card

Banking Officer:
user Receive application
user Check provided information
Is application complete?
Yes
service Perform credit check
What is the credit check result?
Borderline
user Send application to supervisor
Supervisor:
user Perform manual review
Is supervisor decision approval?
Yes
Banking Officer:
service Create card account
service Order card
send Send approval message
Customer: receive Receive approval message
(finish Credit card approved)

Customer:
(start Credit card requested)
user Apply for credit card

Banking Officer:
user Receive application
user Check provided information
Is application complete?
Yes
service Perform credit check
What is the credit check result?
Borderline
user Send application to supervisor
Supervisor:
user Perform manual review
Is supervisor decision approval?
No
Banking Officer:
send Send rejection message
Customer: receive Receive rejection message
(finish Credit card rejected)

== pools ==
Retail Bank -> Customer; Banking Officer; Supervisor
