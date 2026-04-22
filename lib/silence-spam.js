// يكتم سبام libsignal/Baileys (Closing session, Removing old closed session, إلخ)
// يجب أن يُستورد قبل أي شيء يستخدم Baileys.
const __origLog   = console.log.bind(console);
const __origError = console.error.bind(console);
const __SPAM = /^(Closing (open )?session|Removing old closed session|Decrypted message with closed session|Closing session in favor|Old context for|Got message with old counter)/;

function filtered(orig) {
  return (...args) => {
    const a = args[0];
    if (typeof a === 'string' && __SPAM.test(a)) return;
    orig(...args);
  };
}
const __origInfo = console.info.bind(console);
const __origWarn = console.warn.bind(console);
console.log   = filtered(__origLog);
console.error = filtered(__origError);
console.info  = filtered(__origInfo);
console.warn  = filtered(__origWarn);

export default true;
