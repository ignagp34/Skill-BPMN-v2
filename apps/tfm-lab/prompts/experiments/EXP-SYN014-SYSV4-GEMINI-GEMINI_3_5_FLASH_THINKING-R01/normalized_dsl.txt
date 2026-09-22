Traveler:
(start Travel booking initiated)
user Book train ticket
send Booking
(receive Payment request)
Pay booking?
Yes
user Pay booking
send Payment
(receive Ticket)
(finish Ticket received)

Traveler:
(start Travel booking initiated)
user Book train ticket
send Booking
(receive Payment request)
Pay booking?
No
(receive Cancellation notice)
(finish Cancellation notice received)

Agency:
(receive Booking)
service Create reservation
send Payment request
(receive Payment)
service Issue ticket
send Ticket
(finish Ticket issued and sent)

Agency:
(receive Booking)
service Create reservation
send Payment request
(timer Payment deadline)
service Cancel reservation
send Cancellation notice
(finish Reservation cancelled)