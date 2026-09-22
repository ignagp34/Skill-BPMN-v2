Customer: (start Credit card application submitted)
user Submit credit card application
Banking Officer: user Receive credit card application
user Check provided information
Is mandatory information complete?
No
send Request missing information
(finish Application paused pending missing information)

Customer: (start Credit card application submitted)
user Submit credit card application
Banking Officer: user Receive credit card application
user Check provided information
Is mandatory information complete?
Yes
user Perform credit check
What is the credit result?
Approved
user Create card account
user Order card
send Send approval message
(finish Customer notified of approval)

Customer: (start Credit card application submitted)
user Submit credit card application
Banking Officer: user Receive credit card application
user Check provided information
Is mandatory information complete?
Yes
user Perform credit check
What is the credit result?
Borderline
send Send application for manual review
Supervisor: user Review application manually
Does the supervisor approve the application?
Yes
Banking Officer: user Create card account
user Order card
send Send approval message
(finish Customer notified of approval)

Customer: (start Credit card application submitted)
user Submit credit card application
Banking Officer: user Receive credit card application
user Check provided information
Is mandatory information complete?
Yes
user Perform credit check
What is the credit result?
Borderline
send Send application for manual review
Supervisor: user Review application manually
Does the supervisor approve the application?
No
send Send rejection message after manual review
(finish Customer notified of rejection)

Customer: (start Credit card application submitted)
user Submit credit card application
Banking Officer: user Receive credit card application
user Check provided information
Is mandatory information complete?
Yes
user Perform credit check
What is the credit result?
Declined
send Send immediate rejection message
(finish Customer notified of rejection)

== pools ==
Retail Bank -> Customer; Banking Officer; Supervisor
