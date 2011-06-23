include $(GOROOT)/src/Make.inc

TARG=boggle
GOFILES=\
	main.go\
	uuid.go\

include $(GOROOT)/src/Make.cmd
