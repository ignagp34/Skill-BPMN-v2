(start Credit card application received)
Banking Officer: Receive credit card application
Banking Officer: Check provided information
Is mandatory information complete?
No
Banking Officer: Request missing information
(finish Application stopped pending missing information)

(start Credit card application received)
Banking Officer: Receive credit card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Approved
Banking Officer: Create card account
Banking Officer: Order card
Banking Officer: Send approval message
(finish Customer notified of approval)

(start Credit card application received)
Banking Officer: Receive credit card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Borderline
Banking Officer: Send application to supervisor
Supervisor: Review application manually
Does the supervisor approve?
Yes
Banking Officer: Create card account
Banking Officer: Order card
Banking Officer: Send approval message
(finish Customer notified of approval)

(start Credit card application received)
Banking Officer: Receive credit card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Borderline
Banking Officer: Send application to supervisor
Supervisor: Review application manually
Does the supervisor approve?
No
Banking Officer: Send rejection message
(finish Customer notified of rejection)

(start Credit card application received)
Banking Officer: Receive credit card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Declined
Banking Officer: Send rejection message
(finish Customer notified of rejection)