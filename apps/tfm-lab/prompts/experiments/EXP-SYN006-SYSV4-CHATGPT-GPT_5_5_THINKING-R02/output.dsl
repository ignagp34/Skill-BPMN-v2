(start Credit card application received)
Banking Officer: Receive card application
Banking Officer: Check provided information
Is mandatory information complete?
No
Banking Officer: Ask customer to submit missing information
(finish Application stopped pending missing information)

(start Credit card application received)
Banking Officer: Receive card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Approved
Banking Officer: Create card account
Banking Officer: Order card
Banking Officer: send Approval message to customer
(finish Customer notified of approval)

(start Credit card application received)
Banking Officer: Receive card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Borderline
Banking Officer: Send application to supervisor
Supervisor: manual Review application
What is the supervisor decision?
Approve
Banking Officer: Create card account
Banking Officer: Order card
Banking Officer: send Approval message to customer
(finish Customer notified of approval)

(start Credit card application received)
Banking Officer: Receive card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Borderline
Banking Officer: Send application to supervisor
Supervisor: manual Review application
What is the supervisor decision?
Reject
Supervisor: send Rejection message to customer
(finish Customer notified of rejection)

(start Credit card application received)
Banking Officer: Receive card application
Banking Officer: Check provided information
Is mandatory information complete?
Yes
Banking Officer: Perform credit check
What is the credit result?
Declined
Banking Officer: send Rejection message to customer
(finish Customer notified of rejection)