Traveler:
(start Ticket needed)
user Book train ticket
send Booking Request
(receive Payment Request)
Does traveler pay before deadline?
Yes
user Pay booking
send Payment
(receive Ticket)
(finish Ticket received)

Traveler:
(start Ticket needed)
user Book train ticket
send Booking Request
(receive Payment Request)
Does traveler pay before deadline?
No
(receive Cancellation Notice)
(finish Booking cancelled)

Agency:
(receive Booking Request)
service Create reservation
send Payment Request
(receive Payment)
service Issue ticket
send Ticket
(finish Ticket issued)

Agency:
(receive Booking Request)
service Create reservation
send Payment Request
(timer Payment deadline)
service Cancel reservation
send Cancellation Notice
(finish Reservation cancelled)