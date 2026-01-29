import chalk from 'chalk';

class CustomLogger {
  constructor() {
    this.colors = {
      success: chalk.green.bold,
      error: chalk.red.bold,
      warning: chalk.yellow.bold,
      info: chalk.blue.bold,
      debug: chalk.gray.bold,
      route: chalk.cyan.bold,
      service: chalk.magenta.bold,
      database: chalk.white.bold,
      server: chalk.green.bold
    };
  }

  formatMessage(type, message, details = null) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    const colorFn = this.colors[type] || chalk.white;
    const prefix = colorFn(`[${type.toUpperCase()}]`);
    
    let logMessage = `${prefix} : ${message}`;
    
    if (details) {
      if (typeof details === 'object') {
        logMessage += `\n${chalk.gray(JSON.stringify(details, null, 2))}`;
      } else {
        logMessage += ` : ${chalk.gray(details)}`;
      }
    }
    
    return logMessage;
  }

  success(message, details = null) {
    console.log(this.formatMessage('success', message, details));
  }

  error(message, details = null) {
    console.error(this.formatMessage('error', message, details));
  }

  warning(message, details = null) {
    console.warn(this.formatMessage('warning', message, details));
  }

  info(message, details = null) {
    console.log(this.formatMessage('info', message, details));
  }

  debug(message, details = null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(this.formatMessage('debug', message, details));
    }
  }

  route(method, path, status = null) {
    const message = `${method} ${path}${status ? ` - ${status}` : ''}`;
    console.log(this.formatMessage('route', message));
  }

  service(serviceName, message, details = null) {
    const fullMessage = `${serviceName} - ${message}`;
    console.log(this.formatMessage('service', fullMessage, details));
  }

  database(operation, collection, details = null) {
    const message = `Database ${operation} on ${collection}`;
    console.log(this.formatMessage('database', message, details));
  }

  server(message, details = null) {
    console.log(this.formatMessage('server', message, details));
  }

  // Specialized logging methods
  auth(action, details = null) {
    this.service('AUTH', action, details);
  }

  task(action, details = null) {
    this.service('TASK', action, details);
  }

  team(action, details = null) {
    this.service('TEAM', action, details);
  }

  notification(action, details = null) {
    this.service('NOTIFICATION', action, details);
  }

  messaging(action, details = null) {
    this.service('MESSAGING', action, details);
  }

  email(action, details = null) {
    this.service('EMAIL', action, details);
  }

  file(action, details = null) {
    this.service('FILE', action, details);
  }

  cache(action, details = null) {
    this.service('CACHE', action, details);
  }

  // Section separators
  section(title) {
    console.log(chalk.magenta.bold(`\n=== ${title.toUpperCase()} ===`));
  }

  subsection(title) {
    console.log(chalk.cyan.bold(`--- ${title} ---`));
  }

  // Progress indicators
  step(stepNumber, totalSteps, message) {
    const progress = `[${stepNumber}/${totalSteps}]`;
    console.log(chalk.blue(`${progress} ${message}`));
  }

  // Startup sequence logging
  startup() {
    this.section('ALGONIVE BACKEND STARTUP');
  }

  startupComplete(port) {
    this.section('STARTUP COMPLETE');
    this.success(`Server running on port ${port}`);
    console.log(chalk.green.bold('🚀 Algonive Backend is ready!'));
  }

  // Database operations
  dbConnect(database) {
    this.database('Connection', database, 'Established');
  }

  dbDisconnect(database) {
    this.database('Connection', database, 'Closed');
  }

  dbIndex(collection, indexName) {
    this.database('Index Created', `${collection} - ${indexName}`);
  }

  // API Request logging
  apiRequest(req, res, responseTime) {
    const method = req.method;
    const path = req.path;
    const status = res.statusCode;
    const time = `${responseTime}ms`;
    
    let statusColor = chalk.green;
    if (status >= 400) statusColor = chalk.red;
    else if (status >= 300) statusColor = chalk.yellow;
    
    const statusText = statusColor(status);
    console.log(`${chalk.cyan(method)} ${path} - ${statusText} - ${chalk.gray(time)}`);
  }

  // Error logging with stack trace
  errorWithStack(message, error) {
    this.error(message);
    if (error && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  }

  // Performance logging
  performance(operation, duration) {
    const message = `${operation} completed in ${duration}ms`;
    if (duration < 100) {
      this.success(message);
    } else if (duration < 500) {
      this.warning(message);
    } else {
      this.error(message);
    }
  }
}

const logger = new CustomLogger();

export default logger;
