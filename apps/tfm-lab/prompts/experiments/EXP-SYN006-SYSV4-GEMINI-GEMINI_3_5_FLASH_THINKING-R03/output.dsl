(start Card application submitted)
Officer:
receive Receive application
user Check provided information
Is mandatory information missing?
Yes
send Ask customer to submit missing information
(finish Application stopped)

Officer:
(start Card application submitted)
receive Receive application
user Check provided information
Is mandatory information missing?
No
Perform credit check
What is the credit result?
Approved
service Create card account
Order card
send Send approval message
(finish Card approved and customer notified)

Officer:
(start Card application submitted)
receive Receive application
user Check provided information
Is mandatory information missing?
No
Perform credit check
What is the credit result?
Borderline
Send application to supervisor
Supervisor:
user Perform manual review
Is application approved?
Yes
Officer:
service Create card account
Order card
send Send approval message
(finish Card approved and customer notified)

Officer:
(start Card application submitted)
receive Receive application
user Check provided information
Is mandatory information missing?
No
Perform credit check
What is the credit result?
Borderline
Send application to supervisor
Supervisor:
user Perform manual review
Is application approved?
No
Officer:
send Send rejection message
(finish Card rejected and customer notified)

Officer:
(start Card application submitted)
receive Receive application
user Check provided information
Is mandatory information missing?
No
Perform credit check
What is the credit result?
Declined
send Send rejection message
(finish Card rejected and customer notified)