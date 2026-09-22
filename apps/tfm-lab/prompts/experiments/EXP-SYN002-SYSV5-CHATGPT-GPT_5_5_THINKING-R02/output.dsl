(start Password reset requested)
Employee: user Request password reset
Support Agent: receive Receive password reset request
user Verify employee identity
Directory System: service Reset password
Support Agent: send Send temporary password
user Record action in ticket
user Resolve ticket
(finish Password reset ticket resolved)

== pools ==
Organization -> Employee; Support Agent; Directory System
