Traveler:
user Book train ticket
(send Booking Request)
(receive Payment Request)
user Pay booking
(send Payment)
(receive Ticket)

Traveler:
user Book train ticket
(send Booking Request)
(receive Payment Request)
(receive Cancellation Notice)

Agency:
(receive Booking Request)
service Create reservation
(send Payment Request)
receive Payment
service Issue ticket
(send Ticket)

...
receive Payment
(deadline Payment Deadline)
service Cancel reservation
(send Cancellation Notice)