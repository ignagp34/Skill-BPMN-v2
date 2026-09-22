Traveler:
(start Travel planned)
send Book train ticket
(receive Payment Request)
Pay booking?
Yes
user Pay booking
send Payment
(receive Ticket)
(finish Ticket received)

Traveler:
(start Travel planned)
send Book train ticket
(receive Payment Request)
Pay booking?
No
(receive Cancellation notice)
(finish Booking cancelled)

Agency:
(receive Book train ticket)
service Create reservation
send Payment Request
(receive Payment)
service Issue ticket
send Ticket
(finish Ticket sent)

Agency:
(receive Book train ticket)
service Create reservation
send Payment Request
(timer Payment deadline)
service Cancel reservation automatically
send Cancellation notice
(finish Cancellation notice sent)