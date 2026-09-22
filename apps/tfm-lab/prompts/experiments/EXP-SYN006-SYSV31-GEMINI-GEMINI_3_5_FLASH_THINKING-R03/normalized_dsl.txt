Customer: user Apply for new credit card
Banking Officer: receive Receive application
user Check provided information
Is mandatory information missing?
Yes
send Ask customer to submit missing information
(finish Stop application)

Customer: user Apply for new credit card
Banking Officer: receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Approved
service Create card account
service Order card
send Send approval message
(finish Application Closed)

Customer: user Apply for new credit card
Banking Officer: receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Borderline
send Send application to supervisor for manual review
Supervisor: user Perform manual review
Is the application approved?
Yes
Banking Officer: service Create card account
service Order card
send Send approval message
(finish Application Closed)

Customer: user Apply for new credit card
Banking Officer: receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Borderline
send Send application to supervisor for manual review
Supervisor: user Perform manual review
Is the application approved?
No
Banking Officer: send Send rejection message
(finish Application Closed)

Customer: user Apply for new credit card
Banking Officer: receive Receive application
user Check provided information
Is mandatory information missing?
No
service Perform credit check
What is the credit result?
Declined
send Send rejection message
(finish Application Closed)