#run these comamnd under admin ps

#create cert under localmachine\my
#2.5.29.37 has meanings, do change these numbers
$ New-SelfSignedCertificate -Type Custom -Subject "CN=Tss7, O=Tss7, C=DE" -KeyUsage DigitalSignature -FriendlyName "Tss7" -CertStoreLocation "Cert:\LocalMachine\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")

# lick cd to the folder
$ Set-Location Cert:\LocalMachine\My
# list all certs, and get the thumbprint
$ ls

# change passworkd "Tss7" to a secureString
$ $password = ConvertTo-SecureString -String Tss7 -Force -AsPlainText 

#export to a pfx file
$ Export-PfxCertificate -cert "Cert:\LocalMachine\My\D9D14CDF973A3B9657F4125BE1DC7E04CA735820" -FilePath tss7.pfx -Password $password

#check if the setup exe signed
.\node_modules\electron-winstaller\vendor\signtool.exe verify /pa '.\out\make\squirrel.windows\x64\tss7-1.0.0 Setup.exe' 