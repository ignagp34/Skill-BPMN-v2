Customer: (start Credit card application submitted)
Customer: user Apply for credit card
Banking officer: receive Receive application
Banking officer: user Check provided information
Is the application complete?
No
Banking officer: send Request missing information
Customer: receive Receive missing information request
(finish Application paused awaiting information)

Customer: (start Credit card application submitted)
Customer: user Apply for credit card
Banking officer: receive Receive application
Banking officer: user Check provided information
Is the application complete?
Yes
Banking officer: user Perform credit check
What is the credit result?
Approved
Banking officer: user Create card account
Banking officer: user Order card
Banking officer: send Send approval message
Customer: receive Receive approval message
(finish Application approved and customer notified)

Customer: (start Credit card application submitted)
Customer: user Apply for credit card
Banking officer: receive Receive application
Banking officer: user Check provided information
Is the application complete?
Yes
Banking officer: user Perform credit check
What is the credit result?
Borderline
Banking officer: send Send application for manual review
Supervisor: receive Receive application for manual review
Supervisor: user Review application manually
Does the supervisor approve the application?
Yes
Banking officer: user Create card account
Banking officer: user Order card
Banking officer: send Send approval message
Customer: receive Receive approval message
(finish Application approved and customer notified)

Customer: (start Credit card application submitted)
Customer: user Apply for credit card
Banking officer: receive Receive application
Banking officer: user Check provided information
Is the application complete?
Yes
Banking officer: user Perform credit check
What is the credit result?
Borderline
Banking officer: send Send application for manual review
Supervisor: receive Receive application for manual review
Supervisor: user Review application manually
Does the supervisor approve the application?
No
Supervisor: send Send rejection message
Customer: receive Receive rejection message
(finish Application rejected and customer notified)

Customer: (start Credit card application submitted)
Customer: user Apply for credit card
Banking officer: receive Receive application
Banking officer: user Check provided information
Is the application complete?
Yes
Banking officer: user Perform credit check
What is the credit result?
Declined
Supervisor: send Send rejection message
Customer: receive Receive rejection message
(finish Application rejected and customer notified)

== pools ==
Retail bank card application -> Customer; Banking officer; Supervisor
