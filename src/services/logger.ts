import Event from './event';

export class LogService {

  entryLogged: Event<LogEntry> = new Event<LogEntry>();

  logMsg(msg: string) {
    this.entryLogged.emit(new LogMessage(msg));
  }

  logErr(msg: string) {
    this.entryLogged.emit(new ErrorMessage(msg));
  }
}

export interface LogEntry {
  message: string;
}

export class LogMessage implements LogEntry {
  type = 'message';
  constructor(public message: string) {}
}

export class ErrorMessage implements LogEntry {
  type = 'error';
  constructor(public message: string) {}
}

export default new LogService();
